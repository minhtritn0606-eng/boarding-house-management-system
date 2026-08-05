const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { testConnection } = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const houseRoutes = require('./routes/houseRoutes');
const roomRoutes = require('./routes/roomRoutes');

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Boarding House API is running' });
});

app.get('/health', async (req, res) => {
  const dbStatus = await testConnection();

  res.json({
    status: 'ok',
    message: 'Backend is healthy',
    database: dbStatus,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/houses', houseRoutes);
app.use('/api/rooms', roomRoutes);

if (require.main === module) {
  app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);

    const dbStatus = await testConnection();
    if (dbStatus.connected) {
      console.log('MySQL connection successful');
    } else {
      console.log(`MySQL connection failed: ${dbStatus.error}`);
    }
  });
}

module.exports = app;
