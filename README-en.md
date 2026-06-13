<p align="center">
    <img src="doc/demo/logo.png" width="80px" />
    <h1 align="center">Cloud Mail</h1>
    <p align="center">A simple, responsive email service designed to run on Cloudflare Workers 🎉</p> 
    <p align="center">
       <a href="/README.md" style="margin-left: 5px">简体中文</a> | English 
    </p>
    <p align="center">
        <a href="https://github.com/maillab/cloud-mail/tree/main?tab=MIT-1-ov-file" target="_blank" >
            <img src="https://img.shields.io/badge/license-MIT-green" />
        </a>    
        <a href="https://github.com/maillab/cloud-mail/releases" target="_blank" >
            <img src="https://img.shields.io/github/v/release/maillab/cloud-mail" alt="releases" />
        </a>  
        <a href="https://github.com/maillab/cloud-mail/issues" >
            <img src="https://img.shields.io/github/issues/maillab/cloud-mail" alt="issues" />
        </a>  
        <a href="https://github.com/maillab/cloud-mail/stargazers" target="_blank">
            <img src="https://img.shields.io/github/stars/maillab/cloud-mail" alt="stargazers" />
        </a>  
        <a href="https://github.com/maillab/cloud-mail/forks" target="_blank" >
            <img src="https://img.shields.io/github/forks/maillab/cloud-mail" alt="forks" />
        </a>
    </p>
    <p align="center">
        <a href="https://trendshift.io/repositories/20459" target="_blank" >
            <img src="https://trendshift.io/api/badge/repositories/20459" alt="trendshift" >
        </a>
    </p>
</p>

## Description
With only one domain, you can create multiple different email addresses, similar to major email platforms. This project can be deployed on Cloudflare Workers to reduce server costs and build your own email service.
## Project Showcase

- [Live Demo](https://skymail.ink)<br>
- [Deployment Guide](https://doc.skymail.ink/en/)<br>


| ![](/doc/demo/demo1.png) | ![](/doc/demo/demo2.png) |
|--------------------------|--------------------------|
| ![](/doc/demo/demo3.png) | ![](/doc/demo/demo4.png) |

## Features

- **💰 Low-Cost Usage**: No server required — deploy to Cloudflare Workers to reduce costs.

- **💻 Responsive Design**: Automatically adapts to both desktop and most mobile browsers.

- **📧 Email Sending**: Integrated with Resend, supporting bulk email sending and attachments.

- **🛡️ Admin Features**: Admin controls for user and email management with RBAC-based access control.

- **📦 Attachment Support**: Send and receive attachments, stored and downloaded via R2 object storage.

- **🔔 Email Push**: Forward received emails to Telegram bots or other email providers.

- **📡 Open API**: Supports batch user creation via API and multi-condition email queries

- **📨 Transactional Email API**: Lets external products send verification codes, system notifications, and automated emails, then query delivery status.

- **🔢 Verification Code Recognition**: Auto-detect codes via Workers AI

- **📈 Data Visualization**: Use ECharts to visualize system data, including user email growth.

- **🎨 Personalization**: Customize website title, login background, and transparency.

- **🤖 CAPTCHA**: Integrated with Turnstile CAPTCHA to prevent automated registration.

- **📜 More Features**: Under development...

## Tech Stack

- **Platform**: [Cloudflare Workers](https://developers.cloudflare.com/workers/)

- **Web Framework**: [Hono](https://hono.dev/)

- **ORM**: [Drizzle](https://orm.drizzle.team/)

- **Frontend Framework**: [Vue3](https://vuejs.org/)

- **UI Framework**: [Element Plus](https://element-plus.org/)

- **Email Service**: [Resend](https://resend.com/)

- **Cache**: [Cloudflare KV](https://developers.cloudflare.com/kv/)

- **Database**: [Cloudflare D1](https://developers.cloudflare.com/d1/)

- **File Storage**: [Cloudflare R2](https://developers.cloudflare.com/r2/)

## Open API: Verification Codes and Automated Emails

Customers should use the **Developer** page to create their own API Key and sender identities. SMTP, Resend, and Cloudflare Email Sending are platform-level delivery channels managed by the platform administrator; customers do not need to configure SMTP.

Customer integration flow:

1. Sign in and open **Developer**
2. Create an API Key and store it immediately; the plaintext key is shown only once. You can set daily, monthly, and total sending limits. `0` means unlimited
3. Add a sender identity
   - Platform mailboxes are verified automatically
   - Custom-domain senders get a DNS TXT token at `_smmails.<domain>` and can send only after verification
4. Call `/api/open/sendCode` from the customer's backend
5. Use **Developer** to view API Key usage, customer quota, and API send logs

Send verification code example:

```bash
curl -X POST https://your-domain/api/open/sendCode \
  -H "Authorization: Bearer smm_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "fromEmail": "no-reply@yourdomain.com",
    "to": "user@example.org",
    "productName": "Example App",
    "purpose": "sign in",
    "expireMinutes": 10
  }'
```

You can also pass `code` if your product generates the verification code itself. The API returns `code`, `emailId`, and `status/statusText`; store `emailId` if you need to query status later:

```bash
curl -X POST https://your-domain/api/open/sendStatus \
  -H "Authorization: Bearer smm_xxx" \
  -H "Content-Type: application/json" \
  -d '{"emailIds":[123]}'
```

Send a notification:

```bash
curl -X POST https://your-domain/api/open/sendNotice \
  -H "Authorization: Bearer smm_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "fromEmail": "no-reply@example.com",
    "to": ["user@example.org"],
    "productName": "Example App",
    "title": "Order shipped",
    "body": "Your order has shipped. Please check the tracking updates."
  }'
```

Send a custom automated email:

```bash
curl -X POST https://your-domain/api/open/sendAutoMail \
  -H "Authorization: Bearer smm_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "fromEmail": "no-reply@example.com",
    "to": "user@example.org",
    "subject": "Service notification",
    "text": "This automated email was triggered by your product."
  }'
```

`fromEmail` must be added and verified as a sender identity in **Developer** first. API send logs in the customer dashboard only show records sent by the current customer's API Keys.

The admin global public token is still supported for compatibility:

```bash
curl -X POST https://your-domain/api/public/genToken \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin password"}'
```

Then pass `Authorization: <token>` in request headers. The legacy public token endpoints are still supported:

```bash
curl -X POST https://your-domain/api/public/sendNotice \
  -H "Authorization: <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "fromEmail": "no-reply@example.com",
    "to": ["user@example.org"],
    "productName": "Example App",
    "title": "Order shipped",
    "body": "Your order has shipped. Please check the tracking updates."
  }'
```

`fromEmail` must exist in the system and have send permission. If omitted, the admin account email is used by default. External delivery still requires Cloudflare Email Service or a Resend token for the sender domain.

If Cloudflare Email Service or Resend is not available, configure SMTP in system settings:

- Recommended modes are `587 + STARTTLS` or `465 + SSL/TLS`; Cloudflare Workers does not support SMTP port 25
- `SMTP sender email` must be allowed by the SMTP provider, or the domain should have SPF/DKIM/DMARC configured
- The SMTP credential is stored only on the backend; the frontend only shows whether it is configured
- SMTP fallback is intended for verification codes, notifications, and automated emails; emails with attachments or embedded inline images should use Cloudflare Email Service or Resend

## Project Structure

```
cloud-mail
├── mail-worker				    # Backend worker project
│   ├── src                  
│   │   ├── api	 			    # API layer
│   │   ├── const  			    # Project constants
│   │   ├── dao                 # Data access layer
│   │   ├── email			    # Email processing and handling
│   │   ├── entity			    # Database entities
│   │   ├── error			    # Custom exceptions
│   │   ├── hono			    # Web framework, middleware, error handling
│   │   ├── i18n			    # Internationalization
│   │   ├── init			    # Database and cache initialization
│   │   ├── model			    # Response data models
│   │   ├── security			# Authentication and authorization
│   │   ├── service			    # Business logic layer
│   │   ├── template			# Message templates
│   │   ├── utils			    # Utility functions
│   │   └── index.js			# Entry point
│   ├── package.json			# Project dependencies
│   └── wrangler.toml			# Project configuration
│
├─ mail-vue				        # Frontend Vue project
│   ├── src
│   │   ├── axios 			    # Axios configuration
│   │   ├── components			# Custom components
│   │   ├── echarts			    # ECharts integration
│   │   ├── i18n			    # Internationalization
│   │   ├── init			    # Startup initialization
│   │   ├── layout			    # Main layout components
│   │   ├── perm			    # Permissions and access control
│   │   ├── request			    # API request layer
│   │   ├── router			    # Router configuration
│   │   ├── store			    # Global state management
│   │   ├── utils			    # Utility functions
│   │   ├── views			    # Page components
│   │   ├── app.vue			    # Root component
│   │   ├── main.js			    # Entry JS file
│   │   └── style.css			# Global styles
│   ├── package.json			# Project dependencies
└── └── env.release				# Environment configuration

```

## Sponsor

<a href="https://doc.skymail.ink/support.html">
<img width="170px" src="./doc/images/support.png" alt="">
</a>

## License

This project is licensed under the [MIT](LICENSE) license.

## Communication

[Telegram](https://t.me/cloud_mail_tg)
