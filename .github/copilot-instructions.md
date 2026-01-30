# Client Dashboard - AI Coding Instructions

## Project Overview
A React dashboard for tracking RAG (Retrieval-Augmented Generation) client health status, managing tickets, JIRA issues, and incidents. Built with React 18, React Router, and Vite for fintech client monitoring.

## Architecture Patterns

### State Management
- **Context-based state**: All client data managed through [`ClientsContext.jsx`](src/state/ClientsContext.jsx)
- **Local persistence**: Uses `localStorage` with fallback to seed data via [`localClientsRepository`](src/data/clientsRepository.js)
- **Immutable updates**: All state mutations use spread operators, never direct mutation

### Data Layer Structure
```
src/data/
├── clientsRepository.js     # localStorage persistence layer
├── configRepository.js     # App configuration storage
├── reportRepository.js     # CSV parsing and data processing
└── seedClients.js          # Default client data (136 lines of realistic samples)
```

### Component Hierarchy
- **App.jsx**: Route-based navigation shell with Bootstrap navbar
- **Pages**: [`DashboardPage`](src/pages/DashboardPage.jsx), [`ClientDetailPage`](src/pages/ClientDetailPage.jsx), [`ConfigPage`](src/pages/ConfigPage.jsx)
- **Shared components**: [`ClientCard.jsx`](src/components/ClientCard.jsx) for client status tiles

### Client Data Model
Each client has this structure:
```javascript
{
  id: "client-aurora",
  name: "Aurora Pay",
  region: "Europe", 
  product: "VoucherEngine",
  environment: "Production",
  tier: "Gold", // Gold, Silver, Bronze
  currentStatus: "Red", // Red, Amber, Green
  schemes: ["Mastercard", "Visa"], // Payment schemes
  metrics: { tickets: {L1, L2, L3}, jiras: {openCount, critical} },
  history: [{ timestamp, status, note }] // Status change log
}
```

## Development Workflow

### Quick Start
```bash
# From project root:
./scripts/quickstart.sh
```
This script checks Node.js/npm, installs dependencies, and starts the dev server.

### Commands
```bash
npm run dev      # Start Vite dev server
npm run build    # Production build
npm run test     # Run Vitest tests
npm run preview  # Preview production build
```

### Testing Patterns
- **Vitest** for unit tests (see [`reportCsv.test.js`](src/utils/reportCsv.test.js))
- Test CSV parsing with realistic sample data
- Focus on data transformation and parsing logic

### CSV Import System
The app processes two types of CSV reports:
- **Incidents**: Service outages and escalations
- **Support Tickets**: Regular customer inquiries

Key parsing features:
- Header mapping via `INCIDENT_HEADER_KEY_MAP` and `SUPPORT_TICKET_HEADER_KEY_MAP`
- Date normalization: "2026-01-07 20:03" → Date objects
- Organization name matching with client aliases
- Automatic metrics calculation (tickets by age, RCA status)

## Project-Specific Conventions

### File Organization
- **No default exports** in data layer - use named exports for testability
- **Collocated styles**: CSS classes follow Bootstrap conventions
- **Page components**: Handle their own data fetching and routing logic
- **Repository pattern**: All external data access goes through repository modules

### State Updates
```javascript
// Always use functional updates for arrays/objects
setClients((prev) => prev.map(client => 
  client.id === id ? { ...client, ...changes } : client
));

// Status history updates include timestamp
const update = { timestamp: new Date().toISOString(), status, note };
```

### Bootstrap Integration
- Uses Bootstrap 5 classes extensively
- Custom CSS variables in [`styles.css`](src/styles.css)
- Navbar: `app-navbar`, `app-eyebrow` for branded header
- Cards: `status-${color}` classes for Red/Amber/Green indicators

### Assets Structure
- [`src/assets/schemes/`](src/assets/schemes/) for payment scheme logos
- Custom scheme logos via `customSchemeLogo` field in client data
- Logos conditionally rendered in ClientCard components

When modifying this codebase:
1. **Client updates** go through ClientsContext methods (addClient, updateClient, addStatusUpdate)
2. **CSV imports** use reportRepository.js parsing with schema validation
3. **New pages** follow the pattern: create in `/pages`, add route in App.jsx
4. **Tests** should cover data transformations, especially CSV parsing edge cases