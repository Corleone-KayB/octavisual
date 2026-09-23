require('dotenv').config();

const express = require('express');
const path = require('path');
const { connectDB } = require('./lib/db');
const { safeUrl } = require('./lib/view-helpers');
const publicRoutes = require('./routes/public');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.locals.safeUrl = safeUrl;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true, limit: '200kb' }));

app.use('/', publicRoutes);

app.use((req, res) => {
  res.status(404).type('text').send('Not found');
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).type('text').send('Something went wrong.');
});

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Octavisual running at http://localhost:${PORT}`);
    });
  })
  .catch(error => {
    console.error('Could not connect to MongoDB:', error.message);
    process.exit(1);
  });
