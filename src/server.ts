import 'dotenv/config';
import express from 'express';
import path from 'path';
import routes from './routes/router';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.text({ type: 'text/csv', limit: '50mb' }));
app.use('/favicon.ico', express.static(path.join(__dirname, '../src/favicon.ico')));

app.use(routes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
