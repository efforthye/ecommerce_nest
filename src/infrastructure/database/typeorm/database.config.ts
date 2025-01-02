// export interface DatabaseConfig {
//   host: string;
//   port: number;
//   database: string;
//   username: string;
//   password: string;
//   logging: boolean;
// }

// export const dbConfig = () => ({
//   database: {
//     host: process.env.DB_HOST || "localhost",
//     port: process.env.DB_PORT || 3306,
//     database: process.env.DB_DATABASE || "ecommerce",
//     username: process.env.DB_USERNAME || "root",
//     password: process.env.DB_PASSWORD || "1234",
//     logging: process.env.DB_LOGGING_ENABLED == "true" || false,
//   } as DatabaseConfig,
// });