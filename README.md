# Smart Loan Admin

Back-office panel for the Smart Mobile loan system. React + TypeScript + Mantine,
talks to the Loan API's admin endpoints (`/api/v1/admin/*`, repo
[ANUBlS/loan_api](https://github.com/ANUBlS/loan_api)). UI in Azerbaijani and English.

| Screen | What you can do |
|---|---|
| Dashboard | Customers, open/overdue/closed loans, outstanding and overdue amounts, collections today / this month / last 6 months |
| Customers | Search by name or phone, create, edit, block/unblock, **reset access** (signs out every device; next login asks for a new SMS code and PIN) |
| Loans | Search, filter by state, create a loan for a customer, edit terms (while unpaid), restructure, delete (admin) |
| Payment schedule | Every installment with status; edit an unpaid installment's date / principal / interest |
| Payments | Record cash / bank transfer / card payments for the next N installments, filter by date and method, reverse the latest payment (admin) |
| Documents | Upload PDF / images / Word per loan, replace, rename, delete, view, download, regenerate the standard PDFs |
| Applications | Review queue from the app: approve (creates the loan) or reject |
| Products | Rates, limits, terms; add products (admin) |
| Admin users | Accounts with roles **viewer / operator / admin**, reset passwords, deactivate (admin) |
| Audit log | Who changed what and when (admin) |

## Run on the server (Docker)

```bash
git clone https://github.com/ANUBlS/loan_admin.git
cd loan_admin
docker compose up -d --build
```

The panel listens on host port **443** (plain HTTP); the firewall forwards
`smartfinance.az:42410` to it, so open `http://smartfinance.az:42410`
(inside the office: `http://192.168.2.93:443`). The container's nginx serves the panel and forwards `/api/`
to the Loan API at `API_UPSTREAM` (default `http://192.168.2.93:80`). Change it with
`API_UPSTREAM=http://10.0.0.5:80 docker compose up -d`.

**Security**: the panel is reachable from the internet, so use strong passwords for every admin
account, keep the number of admin-role users small, and ideally allow port 42410 only from your
office/VPN IPs on the firewall. Add HTTPS before real customer data is managed through it.

First admin account (on the API server, once):

```bash
cd ~/mobileapi
docker compose exec api python -m scripts.create_admin --username admin --name "Main Admin" --role admin
```

Then sign in and create the other users under **Admin users**. New users with
"must change password" set get a password-change screen on first login.

## Develop

```bash
npm install
API_URL=http://192.168.2.93 npm run dev     # http://localhost:5173, /api proxied to the API
npm run build                               # type check + production build into dist/
```

## Notes

- Sessions last 8 hours and end when the browser tab is closed (token in sessionStorage).
- 5 wrong passwords lock an account for 15 minutes.
- Uploads up to 15 MB (API `MAX_UPLOAD_MB`). If another nginx sits in front of the API, set its `client_max_body_size` to at least `20m`.
- Installments are paid in order; only the latest payment of a loan can be reversed.
