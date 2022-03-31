const router = require('express').Router();
const pool = require('../../config/database');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const { sign } = require('../../services/token');
const sendEmail = require('../../services/email');

const postLoginUser = async (req, res, next) => {
  try {
    const connection = await pool.promise().getConnection();
    const { username, password } = req.body;

    const sqlLoginUser = `SELECT user_id, username, full_name, email, role, is_verified, warehouse_id FROM users WHERE username = ?;`;
    const sqlDataUser = username;

    const result = await connection.query(sqlLoginUser, sqlDataUser);
    connection.release();

    const user = result[0];

    if (!user) return res.status(404).send({ message: 'User not found' });

    // const compareResult = bcrypt.compareSync(password, user.password);

    // if (!compareResult) return res.status(401).send({ message: 'Wrong password' });

    if (!user[0]?.is_verified) return res.status(401).send({ message: 'Please verify your account' });

    const token = sign({ id: user[0].user_id });
    // user:[{id: 1, username: user1}]
    res.status(200).send({ user: user[0], token });
  } catch (error) {
    next(error);
  }
};

const postRegisterUser = async (req, res, next) => {
  try {
    const connection = await pool.promise().getConnection();

    const sqlRegisteruser = `INSERT INTO users SET ?`;
    const sqlDataUser = req.body;

    const isEmail = validator.isEmail(sqlDataUser.email);
    if (!isEmail) return res.status(401).send({ message: 'Format email salah' });

    sqlDataUser.password = bcrypt.hashSync(sqlDataUser.password);

    const result = await connection.query(sqlRegisteruser, sqlDataUser);
    connection.release();

    const user = result[0];
    const token = sign({ id: result.insertId });

    sendEmail({
      reciient: sqlDataUser.email,
      subject: 'Verification',
      templateName: 'verification.html',
      data: {
        username: sqlDataUser.username,
        url: `http://localhost:${process.env.PORT}/users/verify?token=${token}`,
      },
    });

    res.status(201).send({ message: `Data dengan username : ${req.body.username} berhasil ditambahkan` });
  } catch (error) {
    // return res.status(500).send({ code: error.code, message: error.sqlMessage });
    next(error);
  }
};

router.post('/login', postLoginUser);
router.post('/register', postRegisterUser);

module.exports = router;
