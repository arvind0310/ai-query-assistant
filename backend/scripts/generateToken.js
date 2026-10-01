// Prints a test JWT:  npm run token  (or: npm run token -- alice)
import { checkConfig } from '../src/config/index.js';
import { createToken } from '../src/utils/jwt.js';

checkConfig();
console.log(createToken(process.argv[2] || 'test-user'));
