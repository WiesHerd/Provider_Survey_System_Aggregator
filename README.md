# Provider Survey System Aggregator

A modern web application for  processing, analyzing, and visualizing healthcare provider survey data. Built with React, TypeScript, and Tailwind CSS.

## Features

- 📊 Interactive data preview with pagination
- 🔍 Advanced filtering capabilities:
  - Specialty dropdown selection
  - Provider type search
  - Geographic region filtering
- 💰 Automatic currency formatting for TCC and CF columns
- 📱 Responsive design with collapsible sidebar
- 🔄 Real-time data updates
- ⚡ Fast CSV data processing

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/WiesHerd/Provider_Survey_System_Aggregator.git
cd Provider_Survey_System_Aggregator
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Start the development server:
```bash
npm start
# or
yarn start
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── components/          # React components
│   ├── DataPreview/    # Data preview and filtering
│   ├── Sidebar/        # Navigation sidebar
│   └── ...
├── styles/             # CSS and Tailwind styles
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## Development

### Available Scripts

- `npm start` - Runs the app in development mode
- `npm test` - Launches the test runner
- `npm run build` - Builds the app for production
- `npm run eject` - Ejects from Create React App

### Code Style

This project uses:
- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting
- Tailwind CSS for styling

## Features in Detail

### Data Preview
- Displays CSV data in a paginated table
- Automatic formatting for currency values
- Responsive table design

### Filtering System
- Specialty dropdown with unique values
- Provider type text search
- Geographic region filtering
- Real-time filtering updates

### Navigation
- Collapsible sidebar
- Quick access to main features
- Responsive design for mobile devices

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with [Create React App](https://create-react-app.dev/)
- UI components from [Tailwind CSS](https://tailwindcss.com/)
- Icons from [Heroicons](https://heroicons.com/)