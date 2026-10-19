# CSU CEA Laboratory Borrowing System frontend

This is a Vue 3 single-page application built with Vite and Tailwind CSS.

## Development

```bash
npm install
npm run dev
```

The development server runs on port 5172 and proxies `/api` requests to the Django server at `http://127.0.0.1:8000`.

## Password recovery

Accounts need a unique email address to use the **Forgot password?** link. New registrations require an email; existing users can add one from **My Profile**, or an administrator can set one from **Users & Staff**. Run `python manage.py migrate` in `backend` to add the email field.

For local development, Django uses its console email backend, which prints reset links in the backend terminal rather than sending email. Configure a real mail provider before enabling password recovery in production by setting these environment variables for Django:

- `EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend`
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`
- `EMAIL_USE_TLS=true` and `DEFAULT_FROM_EMAIL`
- `FRONTEND_URL` to the public origin of the Vue application

Reset links expire after one hour and can only be used once.

## Production build

```bash
npm run build
```

The Vue application is in `src/vue/`. The retired React source files remain in `src/` as a migration reference, but they are not part of the Vite entry point or dependency graph.
