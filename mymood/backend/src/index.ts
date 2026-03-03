import express from 'express';

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

app.get('/', (req, res) => {
    res.send("Hello from Prisma API");
});

app.listen(port, () => {
    console.log(`Server is runing on http://localhost:${port}`);
}); 