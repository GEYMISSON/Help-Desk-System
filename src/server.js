require('dotenv').config({ path: __dirname + '/../.env' });

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = process.env.SECRET;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// 👇 ROTAS DE PÁGINAS
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/pages/index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/pages/index.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/pages/register.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/pages/dashboard.html'));
});

//////////////////// CONEXÃO ////////////////////

console.log(process.env.MONGO_URI);
mongoose.connect(process.env.MONGO_URI)
.then(() => {
    console.log('MongoDB conectado');
    criarAdmin();
})
.catch(err => console.error(err));

//////////////////// MODELS ////////////////////

const Counter = mongoose.model('Counter', new mongoose.Schema({
    name: String,
    seq: { type: Number, default: 0 }
}));

const Usuario = mongoose.model('Usuario', new mongoose.Schema({
    username: { type: String, unique: true },
    password: String,
    tipo: { type: String, default: 'user' }
}));

const Setor = mongoose.model('Setor', new mongoose.Schema({
    nome: { type: String, unique: true }
}));

const Chamado = mongoose.model('Chamado', new mongoose.Schema({
    tombo: String,
    setor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Setor' },
    usuario_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
    mac: String,
    problema: String,
    acao: String,
    data_acao: String,
    data_atualizacao: String,
    dias_revisao: Number,
    proxima_revisao: String
}));

const PC = mongoose.model('PC', new mongoose.Schema({
    codigo: String,
    sistema: String,
    placaMae: String,
    processador: String,
    memoria: String,
    armazenamento: String,
    fonte: String
}));

const Peca = mongoose.model('Peca', new mongoose.Schema({
    nome: String,
    descricao: String
}));

//////////////////// FUNÇÕES ////////////////////

async function gerarCodigoPC() {
    const counter = await Counter.findOneAndUpdate(
        { name: 'pc' },
        { $inc: { seq: 1 } },
        { returnDocument: 'after', upsert: true }
    );

    const numero = String(counter.seq).padStart(4, '0');
    return `FCJZTI${numero}`;
}

async function criarAdmin() {
    const existe = await Usuario.findOne({ username: 'admin' });

    if (!existe) {
        const hash = await bcrypt.hash('1234', 10);

        await Usuario.create({
            username: 'admin',
            password: hash,
            tipo: 'admin'
        });

        console.log('✅ Admin criado: admin / 1234');
    }
}

//////////////////// MIDDLEWARE ////////////////////

function autenticarToken(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

//////////////////// LOGIN ////////////////////

app.post('/login', async (req, res) => {
    try {
        const user = await Usuario.findOne({ username: req.body.username });

        if (!user) return res.json({ message: "Usuário não encontrado" });

        const valid = await bcrypt.compare(req.body.password, user.password);

        if (!valid) return res.json({ message: "Senha inválida" });

        const token = jwt.sign({ id: user._id, tipo: user.tipo }, SECRET);

        res.json({ token });

    } catch {
        res.status(500).json({ message: "Erro no servidor" });
    }
});

//////////////////// USUÁRIOS ////////////////////

app.post('/register', async (req, res) => {
    try {
        const hash = await bcrypt.hash(req.body.password, 10);
        const tipo = req.body.username === 'admin' ? 'admin' : 'user';

        await Usuario.create({ username: req.body.username, password: hash, tipo });
        res.json({ message: "Usuário criado!" });
    } catch {
        res.json({ message: "Usuário já existe" });
    }
});

app.get('/usuarios', autenticarToken, async (req, res) => {
    res.json(await Usuario.find({}, '_id username tipo'));
});

app.put('/usuarios/:id', autenticarToken, async (req, res) => {
    const { username, password } = req.body;

    const update = { username };

    if (password) {
        update.password = await bcrypt.hash(password, 10);
    }

    await Usuario.findByIdAndUpdate(req.params.id, update);
    res.json({ message: "Atualizado!" });
});

app.delete('/usuarios/:id', autenticarToken, async (req, res) => {
    await Usuario.findByIdAndDelete(req.params.id);
    res.json({ message: "Excluído!" });
});

//////////////////// SETORES ////////////////////

app.get('/setores', autenticarToken, async (req, res) => {
    res.json(await Setor.find());
});

app.post('/setores', autenticarToken, async (req, res) => {
    await Setor.create({ nome: req.body.nome });
    res.json({ message: "Criado!" });
});

app.put('/setores/:id', autenticarToken, async (req, res) => {
    await Setor.findByIdAndUpdate(req.params.id, {
        nome: req.body.nome
    });
    res.json({ message: "Atualizado!" });
});

app.delete('/setores/:id', autenticarToken, async (req, res) => {
    await Setor.findByIdAndDelete(req.params.id);
    res.json({ message: "Excluído!" });
});

//////////////////// PCS ////////////////////

app.get('/pcs', autenticarToken, async (req, res) => {
    res.json(await PC.find());
});

app.post('/pcs', autenticarToken, async (req, res) => {
    try {
        const codigo = await gerarCodigoPC();

        await PC.create({
            ...req.body,
            codigo
        });

        res.json({ message: "PC cadastrado!" });

    } catch (err) {
        res.status(500).json({ message: "Erro ao cadastrar PC" });
    }
});

app.delete('/pcs/:id', autenticarToken, async (req, res) => {
    await PC.findByIdAndDelete(req.params.id);
    res.json({ message: "Excluído!" });
});

//////////////////// PEÇAS ////////////////////

app.get('/pecas', autenticarToken, async (req, res) => {
    res.json(await Peca.find());
});

app.post('/pecas', autenticarToken, async (req, res) => {
    await Peca.create(req.body);
    res.json({ message: "Peça cadastrada!" });
});

app.delete('/pecas/:id', autenticarToken, async (req, res) => {
    await Peca.findByIdAndDelete(req.params.id);
    res.json({ message: "Excluído!" });
});

//////////////////// CHAMADOS ////////////////////

app.post('/chamados', autenticarToken, async (req, res) => {
    try {
        const c = req.body;

        const proxima = new Date(c.data_atualizacao);
        proxima.setDate(proxima.getDate() + Number(c.dias_revisao));

        const novo = await Chamado.create({
            ...c,
            proxima_revisao: proxima.toISOString().split('T')[0]
        });

        res.json({ message: "Chamado criado!" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erro ao criar chamado" });
    }
});

app.get('/chamados', autenticarToken, async (req, res) => {
    try {
        const chamados = await Chamado.find()
            .populate('setor_id', 'nome')
            .populate('usuario_id', 'username');

        res.json(chamados.map(c => ({
            ...c._doc,
            setor: c.setor_id?.nome,
            usuario: c.usuario_id?.username
        })));

    } catch (err) {
        res.status(500).json({ message: "Erro ao buscar chamados" });
    }
});

app.delete('/chamados/:id', autenticarToken, async (req, res) => {
    await Chamado.findByIdAndDelete(req.params.id);
    res.json({ message: "Excluído!" });
});

//////////////////// DASHBOARD ////////////////////

app.get('/dashboard/usuarios', autenticarToken, async (req, res) => {
    try {
        const total = await Usuario.countDocuments();
        res.json({ total });
    } catch (err) {
        res.status(500).json({ message: "Erro ao buscar usuários" });
    }
});

app.get('/dashboard/setores', autenticarToken, async (req, res) => {
    try {
        const total = await Setor.countDocuments();
        res.json({ total });
    } catch (err) {
        res.status(500).json({ message: "Erro ao buscar setores" });
    }
});

app.get('/dashboard/alertas', autenticarToken, async (req, res) => {
    try {
        const hoje = new Date().toISOString().split('T')[0];

        const dados = await Chamado.find({
            proxima_revisao: { $lte: hoje }
        })
        .populate('setor_id', 'nome')
        .populate('usuario_id', 'username');

        res.json(dados.map(a => ({
            ...a._doc,
            setor: a.setor_id?.nome,
            usuario: a.usuario_id?.username
        })));

    } catch (err) {
        res.status(500).json({ message: "Erro ao buscar alertas" });
    }
});

//////////////////// START ////////////////////

app.listen(PORT, () => console.log(`http://localhost:${PORT}`));