import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import cors, { CorsOptions } from 'cors';
import {errorHandler} from '@middlewares/errorHandler';
import { HTTP_STATUS } from '@traits/httpStatus';
import { ApiResponse } from '@utils/apiResponse';
import routes from '@routes/index';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const corsOptions: CorsOptions = {
  origin: [], 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
};
app.use(cors(corsOptions));

app.use('/api/v1', routes);

app.use((req: Request, res: Response, _next: NextFunction) => {
  return res.status(HTTP_STATUS.NOT_FOUND).json(
    new ApiResponse(
      HTTP_STATUS.NOT_FOUND,
      null,
      'Route not found. Please check the requested URL.'
    )
  );
});

// Global error handler
app.use(errorHandler);

export default app;