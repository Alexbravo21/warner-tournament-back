//gcloud run deploy backend-warner --source .
import express from 'express';
import mysql from 'mysql';
import excelJs from 'exceljs';
import 'dotenv/config'
import cors from 'cors';

const app = express();

const pool = mysql.createPool({
   host: 'localhost',
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    ...(process.env.NODE_ENV !== 'local' && {socketPath: `/cloudsql/${process.env.INSTANCE_CONECTION_NAME}`}),
});
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
})

app.get('/', (req, res) => {
    const reject = () => {
      res.setHeader('www-authenticate', 'Basic');
      res.sendStatus(401);
    };
  
    const authorization = req.headers.authorization;
  
    if (!authorization) {
      return reject();
    }
  
    const [username, password] = Buffer.from(
      authorization.replace('Basic ', ''),
      'base64'
    )
      .toString()
      .split(':');
  
    if (!(username === process.env.PARTICIPANT_USER && password === process.env.PARTICIPANT_PASS)) {
      return reject();
    }
    const query = 'SELECT * FROM participants';
    pool.query(query, (error, results) => {
        if(!results) {
            res.json({status: 'There are no participants'});
        } else {
            let wb = new excelJs.Workbook();
            
            const sheet = wb.addWorksheet('participantes');
            sheet.columns = [
                {header: 'Nombre', key: 'name', width: 50},
                {header: 'País', key: 'country', width: 25},
                {header: 'Teléfono', key: 'phone', width: 25},
                {header: 'Correo', key: 'email', width: 50},
                {header: 'Consola', key: 'gamingConsole', width: 20},
                {header: 'Gamer ID', key: 'gamerId', width: 20},
                {header: 'Edad', key: 'age', width: 10},
                {header: 'Newsletter', key: 'newsLetter', width: 15},
            ];
            results.map((participant) => {
                sheet.addRow({
                    name: participant.name,
                    country: participant.country,
                    phone: participant.phone,
                    email: participant.email,
                    gamingConsole: participant.gamingConsole,
                    gamerId: participant.gamerId,
                    age: participant.age,
                    newsLetter: participant.newsLetter,
                })
            });

            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );
            res.setHeader(
                'Content-Disposition',
                'attachment;filename=' + 'participantes.xlsx'
            );
            wb.xlsx.write(res);
        }
    })
});

app.post('/register-participant', (req, res) => {
    console.log(req.body);
    const data ={
        name: req.body.name,
        country: req.body.country,
        phone: req.body.phone,
        email: req.body.email,
        gamingConsole: req.body.gamingConsole,
        gamerId: req.body.gamerId,
        age: req.body.age,
        newsLetter: req.body.newsLetter,
    }
    const query = 'INSERT INTO participants VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    pool.query(query, Object.values(data), (error) => {
        if(error){
            res.status(500).json({reason: error.code});
        }else {
            res.status(200).json({data})
        }
    })
})