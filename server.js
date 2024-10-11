//Config express
import express from 'express';
import cors from 'cors';
import config from './config/config.js';  // Add `.js` for local files
import logger from './middleware/logger.js';
import connectDB from './config/db.js';  // Import DB connection
import miscellaneousRoutes from './routes/miscellaneousRoutes.js';
// const workoutRoutes = require("./routes/workouts.js");
// const usersRoutes = require("./routes/users.js");
// const userPortfolio = require("./routes/userPortfolio.js");

const app = express();

// Connect to MongoDB
connectDB();

// configuration cors
const corsOptions = {
  origin: ["http://localhost:5173", "https://api.coingecko.com/"],
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(cors());
app.use(express.json());
app.use(logger);

// middleware pour logger les requetes
app.use((req, res, next) => {
  console.log(req.path, req.method);
  next();
});

// routes
// app.use("/api/workouts/", workoutRoutes);
// app.use("/api/portfolio/", userPortfolio);
// app.use("/api/transactions/", transactionsRoutes);
// app.use("/api/users/", usersRoutes);
app.use("/api/misc/", miscellaneousRoutes);

app.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);
});
