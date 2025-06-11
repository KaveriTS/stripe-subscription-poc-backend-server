# Stripe Subscription Backend (POC)

This is the backend API service for a proof-of-concept **Stripe subscription system** using **two Stripe accounts**:
- **Account A**: Manages customers, products, subscriptions, and invoices
- **Account B**: Manually captures payments using stored payment methods



## Architecture Overview

- **Node.js + Express**
- **MongoDB** for storing customers and subscriptions
- **Stripe SDKs** for both Account A (subscriptions) and Account B (payments)
- **Webhooks** to handle billing events like invoice creation, success, and failure
- **Dual Stripe Setup**:
  - Account A creates subscriptions and invoices
  - Account B handles actual payment capture via `paymentIntent`


## Features

- Subscription creation
- Renewal billing
- Retry email & hosted invoice links
- Payment failure + recovery
- Manual payment processing
- Webhook-driven DB sync
- Rate limiting and security middleware
- Comprehensive error handling
- Input validation
- Clean code architecture

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- Two Stripe accounts (for testing, you can use the same account with different API keys)
- Email service credentials (Gmail or other SMTP provider)

## 🛠️ Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy the example environment file and configure your settings:

```bash
cp env.example .env
```

Update the `.env` file with your actual values.

### 3. Stripe Setup

#### Account A (Subscription Management):
1. Create products and price objects in Stripe Dashboard
2. Set up webhook endpoint pointing to `/api/webhooks/stripe`

#### Account B (Payment Processing):
1. This account will be used for creating Payment Intents
2. No additional setup required

### 4. Start the Server

```bash
npm run dev
```

The server will start on `http://localhost:7000`

## API Documentation

### Subscription Routes
- `POST /api/subscription` - Create a new subscription
- `GET /api/subscription/status` - Get subscription status by email

### Webhook Routes
- `POST /api/webhook/stripe` - Handle Stripe webhook events

### Product Routes
- `GET /api/products` - Get list of all products

### Price Routes
- `GET /api/prices` - Get list of all prices

## Subscription Flow

### 1. Initial Subscription Creation

1. Frontend collects email, card details, and plan selection
2. Frontend creates Payment Method using Stripe Account B
3. Frontend sends request to `/api/subscriptions` with Payment Method ID
4. Backend creates customer in Stripe Account A
5. Backend creates subscription in Stripe Account A
6. Backend stores customer and subscription data in MongoDB

### 2. Payment Processing

1. Stripe Account A generates `invoice.created` webhook
2. Backend processes payment using Account B with stored Payment Method
3. Stripe Account A receives payment confirmation
4. Backend updates subscription status
5. Customer receives confirmation email

### 3. Failed Payment Retry

1. Payment fails, triggering `invoice.payment_failed` webhook
2. Backend updates subscription status to `past_due`
3. Customer receives retry email with link
4. Customer updates payment method and retries
5. Backend processes retry payment using Account B

## Project Structure
```
src/
├── config/         # Configuration files (environment, database, etc.)
├── controllers/    # Route controllers
├── middleware/     # Custom middleware (validation, rate limiting, etc.)
├── models/         # Database models
├── routes/         # API routes
└── services/       # Business logic and external service integrations
```
## Stripe Test Key Configuration

To run this project, you need a Stripe test secret key.  
Set your key in your environment variables as:

```
STRIPE_SECRET_KEY=sk_test_...
```

You can find your test key in your [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys).

## Stripe Test Cards

Use the following test cards to simulate different payment outcomes:

- **Success:**  
  `4242 4242 4242 4242` (Any future expiry, any CVC)

- **Failure (Insufficient funds):**  
  `4000 0000 0000 9995`

- **Failure (Card declined):**  
  `4000 0000 0000 0002`

- **Failure (Incorrect CVC):**  
  `4000 0000 0000 0127`

For more test cards, see the [Stripe Testing Documentation](https://stripe.com/docs/testing).

## Security Features

- **Rate Limiting**: Prevents API abuse
- **Input Validation**: Validates all incoming requests
- **CORS**: Configured for specific frontend origin
- **Helmet**: Security headers
- **Error Handling**: Prevents information leakage
- **Webhook Signature Verification**: Ensures webhook authenticity

## Error Handling

The API returns consistent error responses:

```json
{
  "status": "error",
  "message": "Description of the error"
}
```

## Email Notifications

The system sends emails for:
- Subscription confirmation
- Payment failure notifications with retry links

## Integration with Frontend

The backend is designed to work with a React frontend using Stripe Elements. The frontend should:

1. Initialize Stripe with Account B's publishable key
2. Collect payment method using Stripe Elements
3. Send payment method ID to this backend
4. Handle subscription creation responses

*This project was created for a hands-on understanding of subscription systems using Stripe's APIs and manual invoice capture via split accounts.*