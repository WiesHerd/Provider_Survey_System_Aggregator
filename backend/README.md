# 🚀 Survey Aggregator Backend

A powerful Express.js backend API for the Survey Aggregator system, designed to handle physician compensation survey data with advanced filtering, analytics, and export capabilities.

## ✨ Features

- **📊 Survey Management**: Upload, store, and manage multiple survey datasets
- **🔍 Advanced Filtering**: Filter by specialty, provider type, region, and more
- **📈 Analytics**: Built-in statistics and data aggregation
- **💾 SQLite Database**: Lightweight, file-based database perfect for development
- **🔄 Real-time Processing**: CSV parsing and data validation on upload
- **📤 Export Capabilities**: Export filtered data to CSV format
- **🔒 Security**: Rate limiting, CORS, and security headers
- **📱 RESTful API**: Clean, intuitive API endpoints

## 🏗️ Architecture

```
Backend/
├── server.js          # Main Express server
├── package.json       # Dependencies and scripts
├── survey_data.db     # SQLite database (auto-created)
├── uploads/           # Temporary file storage
└── README.md          # This file
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Start the Server

```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3001`

### 3. Test the API

```bash
# Health check
curl http://localhost:3001/api/health

# Should return: {"status":"OK","timestamp":"..."}
```

## 📡 API Endpoints

### 🔍 Health Check
- **GET** `/api/health` - Server status and timestamp

### 📤 Survey Upload
- **POST** `/api/upload` - Upload a new survey CSV file
  - **Body**: `multipart/form-data`
  - **Fields**: 
    - `survey`: CSV file
    - `name`: Survey name
    - `year`: Survey year
    - `type`: Survey type

### 📊 Survey Management
- **GET** `/api/surveys` - Get all uploaded surveys
- **DELETE** `/api/survey/:id` - Delete a survey and its data

### 📈 Data Access
- **GET** `/api/survey/:id/data` - Get survey data with filters
  - **Query Parameters**:
    - `specialty`: Filter by specialty
    - `providerType`: Filter by provider type
    - `region`: Filter by region
    - `page`: Page number (default: 1)
    - `limit`: Items per page (default: 100)

- **GET** `/api/survey/:id/filters` - Get unique filter values for a survey

### 📤 Data Export
- **GET** `/api/survey/:id/export` - Export survey data to CSV
  - **Query Parameters**:
    - `format`: Export format (currently only 'csv' supported)

## 🗄️ Database Schema

### Surveys Table
```sql
CREATE TABLE surveys (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  year INTEGER,
  type TEXT,
  uploadDate TEXT,
  rowCount INTEGER,
  specialtyCount INTEGER,
  dataPoints INTEGER,
  colorAccent TEXT,
  metadata TEXT
);
```

### Survey Data Table
```sql
CREATE TABLE survey_data (
  id TEXT PRIMARY KEY,
  surveyId TEXT,
  specialty TEXT,
  providerType TEXT,
  region TEXT,
  tcc REAL,        -- Total Cash Compensation
  cf REAL,         -- Conversion Factor
  wrvu REAL,       -- Work RVU
  count INTEGER,
  FOREIGN KEY (surveyId) REFERENCES surveys (id)
);
```

### Specialty Mappings Table
```sql
CREATE TABLE specialty_mappings (
  id TEXT PRIMARY KEY,
  sourceSpecialty TEXT,
  mappedSpecialty TEXT,
  createdDate TEXT
);
```

## 🔧 Configuration

### Environment Variables
- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment (development/production)

### File Upload Limits
- **Max File Size**: 50MB
- **Allowed Types**: CSV files only
- **Storage**: Local `uploads/` directory (auto-created)

### Security Settings
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS**: Enabled for cross-origin requests
- **Helmet**: Security headers enabled

## 🚀 Deployment Options

### 1. Local Development
```bash
npm run dev
```

### 2. Azure App Service
```bash
# Build and deploy
npm run build
az webapp deployment source config-zip --resource-group SurveyAggregator --name your-app-name --src dist.zip
```

### 3. Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

### 4. Azure Functions (Serverless)
Convert to Azure Functions for serverless deployment with automatic scaling.

## 📊 Data Processing

### CSV Parsing
- Automatic column detection
- Data type validation
- Error handling for malformed data
- Support for large files (streaming)

### Data Validation
- Numeric validation for TCC, CF, wRVU, Count
- String sanitization for text fields
- Duplicate handling
- Foreign key constraints

## 🔍 Filtering & Search

### Supported Filters
- **Specialty**: Exact match or partial text search
- **Provider Type**: Provider classification
- **Region**: Geographic location
- **Pagination**: Page-based navigation with configurable limits

### Performance
- Indexed database queries
- Efficient LIKE queries for text search
- Pagination to handle large datasets
- Prepared statements for security

## 📈 Analytics Features

### Built-in Statistics
- Row count per survey
- Unique specialty count
- Data point totals
- Upload metadata tracking

### Extensible Analytics
- Custom aggregation queries
- Statistical calculations
- Trend analysis capabilities
- Export-ready data formats

## 🛠️ Development

### Prerequisites
- Node.js 18+ 
- npm or yarn
- SQLite3 (included)

### Development Commands
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start

# Check for security vulnerabilities
npm audit

# Run tests (when implemented)
npm test
```

### Code Structure
- **Modular design** for easy maintenance
- **Error handling** throughout the application
- **Logging** for debugging and monitoring
- **Type safety** with JSDoc comments

## 🔒 Security Considerations

- **Input Validation**: All inputs are validated and sanitized
- **SQL Injection Protection**: Prepared statements and parameterized queries
- **File Upload Security**: File type and size restrictions
- **Rate Limiting**: Prevents abuse and DoS attacks
- **CORS Configuration**: Configurable cross-origin access

## 📝 API Examples

### Upload a Survey
```bash
curl -X POST http://localhost:3001/api/upload \
  -F "survey=@survey.csv" \
  -F "name=MGMA 2024" \
  -F "year=2024" \
  -F "type=Compensation"
```

### Get Survey Data with Filters
```bash
curl "http://localhost:3001/api/survey/123/data?specialty=Cardiology&page=1&limit=50"
```

### Export Survey Data
```bash
curl "http://localhost:3001/api/survey/123/export?format=csv" -o exported_data.csv
```

## 🚨 Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Change port in server.js or set environment variable
   PORT=3002 npm start
   ```

2. **Database Permission Errors**
   ```bash
   # Ensure write permissions in backend directory
   chmod 755 backend/
   ```

3. **File Upload Failures**
   - Check file size (max 50MB)
   - Verify file is valid CSV
   - Check uploads/ directory permissions

4. **CORS Issues**
   - Verify frontend URL is allowed
   - Check CORS configuration in server.js

### Debug Mode
```bash
# Enable debug logging
DEBUG=* npm run dev
```

## 🔮 Future Enhancements

- **Authentication & Authorization**: User management and role-based access
- **Advanced Analytics**: Statistical analysis and reporting
- **Real-time Updates**: WebSocket support for live data
- **Cloud Storage**: Azure Blob Storage integration
- **Machine Learning**: Automated data insights and predictions
- **API Versioning**: Versioned API endpoints
- **Swagger Documentation**: Interactive API documentation

## 📞 Support

For issues and questions:
1. Check the troubleshooting section above
2. Review the API documentation
3. Check server logs for error details
4. Verify database integrity

## 📄 License

MIT License - see LICENSE file for details

---

**Built with ❤️ for the Survey Aggregator system**

