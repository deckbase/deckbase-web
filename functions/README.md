# Firebase Cloud Functions

## Setup

1. In the `functions/` directory, install and deploy:

   ```bash
   cd functions
   npm install
   cd ..
   firebase use <your-project>
   firebase deploy --only functions
   ```

Add new triggers in `index.js` as needed.
