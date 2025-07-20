import os
import openai
import json
from tools import ToolRegistry
from typing import Any, Dict, Optional

class AgentOrchestrator:
    """
    Async agent orchestrator for Wendy. Loads all tools, receives a message and context, uses OpenAI function calling
    to select and execute tools, and returns the result. Can be triggered by chat or email events.
    """
    def __init__(self, db, email_service, smtp_user, smtp_pass, openai_api_key=None):
        self.openai_api_key = openai_api_key or os.getenv("OPENAI_API_KEY") or "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"
        self.tool_registry = ToolRegistry(db, email_service, smtp_user, smtp_pass, self.openai_api_key)
        self.openai_client = openai.AsyncOpenAI(api_key=self.openai_api_key)

    async def handle_event(self, message: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Receives a message and context, sends to OpenAI with tool schema, executes selected tool(s), returns result.
        Implements automatic retry: if a tool call fails due to missing wedding details, stores the original tool call in context. After a successful update_wedding_details call, retries the original tool call.
        """
        tools = self.tool_registry.get_tools()
        functions = []
        for tool in tools:
            if tool.name == "list_guests":
                functions.append({
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "rsvp_filter": {
                                "type": "string",
                                "description": "RSVP status to filter by (yes, no, maybe, unknown, null)"
                            }
                        },
                        "required": []
                    }
                })
            else:
                functions.append({
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": {"type": "object", "properties": {}},
                })
        messages = [
            {"role": "system", "content": "You are Wendy, an AI wedding planner. Use the available tools to help the user."},
            {"role": "user", "content": message},
        ]
        if context:
            messages.append({"role": "system", "content": f"Context: {json.dumps(context)}"})
        response = await self.openai_client.chat.completions.create(
            model="gpt-3.5-turbo-1106",
            messages=messages,
            functions=functions,
            function_call="auto"
        )
        choice = response.choices[0]
        if choice.finish_reason == "function_call":
            fn_call = choice.message.function_call
            tool_name = fn_call.name
            tool_args = json.loads(fn_call.arguments) if fn_call.arguments else {}
            tool = self.tool_registry.get_tool_by_name(tool_name)
            if tool:
                result = await tool.run(tool_args)
                # Check for missing wedding details error from send_invite
                if tool_name == "send_invite" and isinstance(result, dict) and not result.get("success") and "wedding details" in result.get("message", ""):
                    # Store the original intent in context
                    if context is None:
                        context = {}
                    context["pending_tool_call"] = {"tool_name": tool_name, "tool_args": tool_args}
                    # Prompt user for missing details
                    return {"reply": result["message"], "context": context}
                # If we just updated wedding details and have a pending tool call, retry it
                if tool_name == "update_wedding_details" and context and context.get("pending_tool_call"):
                    pending = context.pop("pending_tool_call")
                    pending_tool = self.tool_registry.get_tool_by_name(pending["tool_name"])
                    if pending_tool:
                        retry_result = await pending_tool.run(pending["tool_args"])
                        # Summarize retry result
                        if not isinstance(retry_result, str):
                            summary_prompt = f"You are Wendy, an AI wedding planner. Here is the result of a tool call: {json.dumps(retry_result)}. Please summarize or present this information in a friendly, natural language reply for the user."
                            summary_response = await self.openai_client.chat.completions.create(
                                model="gpt-3.5-turbo-1106",
                                messages=[{"role": "user", "content": summary_prompt}],
                            )
                            summary_text = summary_response.choices[0].message.content
                            return {"reply": summary_text, "context": context}
                        else:
                            return {"reply": retry_result, "context": context}
                # Normal tool call result
                if not isinstance(result, str):
                    summary_prompt = f"You are Wendy, an AI wedding planner. Here is the result of a tool call: {json.dumps(result)}. Please summarize or present this information in a friendly, natural language reply for the user."
                    summary_response = await self.openai_client.chat.completions.create(
                        model="gpt-3.5-turbo-1106",
                        messages=[{"role": "user", "content": summary_prompt}],
                    )
                    summary_text = summary_response.choices[0].message.content
                    return {"reply": summary_text, "context": context}
                else:
                    return {"reply": result, "context": context}
            else:
                return {"error": f"Tool not found: {tool_name}"}
        else:
            return {"reply": choice.message.content, "context": context} 