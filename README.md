# 💍 Wendy AI Wedding Planner

A comprehensive Next.js 14 wedding planning application with AI assistance, built with TypeScript, Tailwind CSS, and shadcn/ui.

## Features

- **Persistent Sidebar Navigation**: Collapsible sidebar with vendor/venue, guests, calendar, chat, and settings pages
- **Vendor Management**: Grid view of wedding vendors and venues with contact information
- **Guest Management**: Interactive table with editable RSVP status and dietary preferences
- **Calendar View**: Timeline of wedding events and appointments
- **AI Chat Interface**: Chat with Wendy, your AI wedding planning assistant
- **Action Log**: Real-time activity tracking in bottom-right panel
- **Responsive Design**: Mobile-friendly with Tailwind CSS
- **Type Safety**: Full TypeScript implementation with strict mode

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: React Context with useReducer
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
\`\`\`bash
git clone <repository-url>
cd wendy-wedding-planner
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Run the development server:
\`\`\`bash
npm run dev
\`\`\`

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

\`\`\`
src/
├── app/
│   ├── (dashboard)/           # Dashboard route group
│   │   ├── vendors/          # Vendor management page
│   │   ├── guests/           # Guest list management
│   │   ├── calendar/         # Event calendar
│   │   ├── chat/             # AI chat interface
│   │   ├── settings/         # Settings page
│   │   └── layout.tsx        # Dashboard layout with sidebar
│   ├── context/
│   │   └── wendy-context.tsx # Global state management
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Home page (redirects to vendors)
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── app-sidebar.tsx       # Main navigation sidebar
│   ├── action-log.tsx        # Activity log component
│   ├── vendor-card.tsx       # Vendor display card
│   ├── guest-table.tsx       # Guest management table
│   ├── full-calendar.tsx     # Calendar component
│   └── chat-interface.tsx    # Chat UI component
\`\`\`

## State Management

The app uses a centralized React Context (`useWendyState`) with the following data structure:

\`\`\`typescript
type WendyState = {
  vendors: Vendor[]     // Wedding vendors and venues
  guests: Guest[]       // Guest list with RSVP status
  events: CalEvent[]    // Calendar events and appointments
  messages: Message[]   // Chat conversation history
  logs: LogEntry[]      // Activity log entries
}
\`\`\`

## API Integration Points

The following TODO comments indicate where API integration should be implemented:

- `POST /api/vendors` - Add new vendor
- `PUT /api/guests/:id` - Update guest information
- `POST /api/events` - Create calendar event
- `POST /api/messages` - Send chat message
- `POST /api/chat` - AI chat completion

## Build and Deploy

\`\`\`bash
# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
\`\`\`

## Customization

### Brand Colors
The app uses `indigo-600` as the primary brand color. Update the Tailwind classes throughout the components to change the color scheme.

### Adding New Features
1. Add new action types to the `WendyAction` union in `wendy-context.tsx`
2. Update the reducer to handle new actions
3. Create new components in the `components/` directory
4. Add new routes under `app/(dashboard)/`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run build` to ensure it builds successfully
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
