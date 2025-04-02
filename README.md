# PDF Store

A secure web application for selling and managing PDF documents with Razorpay integration.

## Features

- Admin panel for managing PDFs
- Secure PDF upload and storage
- User-friendly catalog browsing
- Razorpay payment integration
- Secure download system
- Responsive design

## Setup Instructions

1. Clone the repository to your local system.

2. Create a `pdfs` directory in the root folder to store uploaded PDFs:
```bash
mkdir pdfs
```

3. Replace the Razorpay API key in `js/catalog.js`:
```javascript
const RAZORPAY_KEY_ID = 'YOUR_RAZORPAY_KEY_ID';
```

4. Set up a local web server (e.g., using Python's built-in server):
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

5. Access the application at `http://localhost:8000`

## Admin Access

- Username: `admin`
- Password: `admin123`

## Directory Structure

```
pdf-store/
├── admin/
│   ├── login.html
│   ├── dashboard.html
│   ├── admin.css
│   └── admin.js
├── css/
│   └── style.css
├── js/
│   ├── catalog.js
│   └── download.js
├── pdfs/
│   └── (uploaded PDFs)
├── index.html
├── catalog.html
├── download.html
└── README.md
```

## Security Notes

1. In a production environment:
   - Store admin credentials securely
   - Implement proper session management
   - Use HTTPS
   - Add server-side validation
   - Implement proper payment verification

2. PDF Storage:
   - PDFs are stored locally in the `pdfs` directory
   - Implement proper file access controls
   - Regular backup recommended

## Usage

### For Admins

1. Access admin panel at `/admin/login.html`
2. Log in with admin credentials
3. Upload, manage, and delete PDFs
4. Set prices and descriptions

### For Users

1. Browse available PDFs in the catalog
2. Select a PDF to purchase
3. Complete payment through Razorpay
4. Download PDF after successful payment

## Support

For issues or questions, please create an issue in the repository.

## License

MIT License - Feel free to use and modify for your needs. 