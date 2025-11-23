# Direct Trader Communications - API Documentation

## Overview

The Direct Trader Communications API provides backend services for the professional trading dealerboard platform. It supports Oracle SBC and AudioCodes integration, call management, and white-label banking solutions.

## Base URL

- **Development**: `http://localhost:8000`
- **Production**: `https://direct-trader-api.railway.app`

## Authentication

Currently using basic authentication. In production, implement OAuth 2.0 or JWT tokens.

## Endpoints

### Health Check

```http
GET /health
```

Returns the API health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-13T10:30:00Z"
}
```

### Bank Configuration

#### Configure Bank
```http
POST /banks/{bank_id}/configure
```

Configure a bank's trading lines and infrastructure.

**Request Body:**
```json
{
  "bank_id": "bank_001",
  "bank_name": "First National Bank",
  "oracle_sbc_host": "sbc.bank.com",
  "oracle_sbc_port": 5061,
  "audiocodes_host": "audiocodes.bank.com",
  "audiocodes_port": 5060,
  "sip_domain": "bank.com",
  "lines": [
    {
      "id": "hoot-1",
      "name": "Trading Floor",
      "number": "1001",
      "type": "hoot",
      "status": "active",
      "participants": ["Trader A", "Trader B"]
    }
  ]
}
```

#### Get Bank Lines
```http
GET /banks/{bank_id}/lines
```

Get all trading lines for a specific bank.

#### Get Lines by Type
```http
GET /banks/{bank_id}/lines/{line_type}
```

Get lines filtered by type (hoot, ard, mrd).

### Call Management

#### Initiate Call
```http
POST /calls/initiate
```

Initiate a call on a trading line.

**Request Body:**
```json
{
  "line_id": "hoot-1",
  "bank_id": "bank_001"
}
```

**Response:**
```json
{
  "id": "call_hoot-1_1705123456",
  "line_id": "hoot-1",
  "address": "1001",
  "line_type": "hoot",
  "status": "initiating",
  "start_time": "2025-01-13T10:30:00Z"
}
```

#### Answer Call
```http
POST /calls/{call_id}/answer
```

Answer an incoming call.

#### End Call
```http
POST /calls/{call_id}/end
```

End an active call.

#### Get Active Calls
```http
GET /calls/active
```

Get all currently active calls.

### Oracle SBC Integration

#### Register with Oracle SBC
```http
POST /oracle-sbc/register
```

Register a user with Oracle SBC.

**Request Body:**
```json
{
  "bank_id": "bank_001",
  "username": "trader001",
  "password": "secure_password"
}
```

### AudioCodes Integration

#### Configure AudioCodes
```http
POST /audiocodes/configure
```

Configure AudioCodes infrastructure for a bank.

### White-label Support

#### Get Bank Branding
```http
GET /banks/{bank_id}/branding
```

Get branding configuration for white-label support.

**Response:**
```json
{
  "bank_name": "First National Bank",
  "primary_color": "#1E40AF",
  "secondary_color": "#F59E0B",
  "logo_url": "/branding/bank_001/logo.png",
  "app_name": "First National Bank Trader"
}
```

## Error Handling

All endpoints return appropriate HTTP status codes:

- `200` - Success
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error

Error responses include a detail message:

```json
{
  "detail": "Bank not found"
}
```

## Rate Limiting

- 100 requests per minute per IP
- 1000 requests per hour per bank

## WebSocket Support

Real-time call status updates via WebSocket:

```javascript
const ws = new WebSocket('wss://direct-trader-api.railway.app/ws/calls');
ws.onmessage = (event) => {
  const callUpdate = JSON.parse(event.data);
  // Handle call status updates
};
```

## SDK Examples

### Python
```python
import httpx

client = httpx.Client(base_url="https://direct-trader-api.railway.app")

# Configure bank
response = client.post("/banks/bank_001/configure", json={
    "bank_id": "bank_001",
    "bank_name": "First National Bank",
    "lines": [...]
})
```

### Swift
```swift
import Foundation

struct APIClient {
    let baseURL = "https://direct-trader-api.railway.app"
    
    func initiateCall(lineId: String, bankId: String) async throws -> CallInfo {
        // Implementation
    }
}
```

## Production Considerations

1. **Security**: Implement proper authentication and authorization
2. **Database**: Replace in-memory storage with PostgreSQL
3. **Caching**: Add Redis for session management
4. **Monitoring**: Add logging and metrics collection
5. **Scaling**: Implement horizontal scaling with load balancers

