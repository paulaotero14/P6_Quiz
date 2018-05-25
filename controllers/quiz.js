const Sequelize = require("sequelize");
const {models} = require("../models");

// Autoload the quiz with id equals to :quizId
exports.load = (req, res, next, quizId) => {

    models.quiz.findById(quizId)
    .then(quiz => {
        if (quiz) {
            req.quiz = quiz;
            next();
        } else {
            throw new Error('There is no quiz with id=' + quizId);
        }
    })
    .catch(error => next(error));
};


// GET /quizzes
exports.index = (req, res, next) => {

    models.quiz.findAll()
    .then(quizzes => {
        res.render('quizzes/index.ejs', {quizzes});
    })
    .catch(error => next(error));
};


// GET /quizzes/:quizId
exports.show = (req, res, next) => {

    const {quiz} = req;

    res.render('quizzes/show', {quiz});
};


// GET /quizzes/new
exports.new = (req, res, next) => {

    const quiz = {
        question: "", 
        answer: ""
    };

    res.render('quizzes/new', {quiz});
};

// POST /quizzes/create
exports.create = (req, res, next) => {

    const {question, answer} = req.body;

    const quiz = models.quiz.build({
        question,
        answer
    });

    // Saves only the fields question and answer into the DDBB
    quiz.save({fields: ["question", "answer"]})
    .then(quiz => {
        req.flash('success', 'Quiz created successfully.');
        res.redirect('/quizzes/' + quiz.id);
    })
    .catch(Sequelize.ValidationError, error => {
        req.flash('error', 'There are errors in the form:');
        error.errors.forEach(({message}) => req.flash('error', message));
        res.render('quizzes/new', {quiz});
    })
    .catch(error => {
        req.flash('error', 'Error creating a new Quiz: ' + error.message);
        next(error);
    });
};


// GET /quizzes/:quizId/edit
exports.edit = (req, res, next) => {

    const {quiz} = req;

    res.render('quizzes/edit', {quiz});
};


// PUT /quizzes/:quizId
exports.update = (req, res, next) => {

    const {quiz, body} = req;

    quiz.question = body.question;
    quiz.answer = body.answer;

    quiz.save({fields: ["question", "answer"]})
    .then(quiz => {
        req.flash('success', 'Quiz edited successfully.');
        res.redirect('/quizzes/' + quiz.id);
    })
    .catch(Sequelize.ValidationError, error => {
        req.flash('error', 'There are errors in the form:');
        error.errors.forEach(({message}) => req.flash('error', message));
        res.render('quizzes/edit', {quiz});
    })
    .catch(error => {
        req.flash('error', 'Error editing the Quiz: ' + error.message);
        next(error);
    });
};


// DELETE /quizzes/:quizId
exports.destroy = (req, res, next) => {

    req.quiz.destroy()
    .then(() => {
        req.flash('success', 'Quiz deleted successfully.');
        res.redirect('/quizzes');
    })
    .catch(error => {
        req.flash('error', 'Error deleting the Quiz: ' + error.message);
        next(error);
    });
};


// GET /quizzes/:quizId/play
exports.play = (req, res, next) => {

    const {quiz, query} = req;

    const answer = query.answer || '';

    res.render('quizzes/play', {
        quiz,
        answer
    });
};


// GET /quizzes/:quizId/check
exports.check = (req, res, next) => {

    const {quiz, query} = req;

    const answer = query.answer || "";
    const result = answer.toLowerCase().trim() === quiz.answer.toLowerCase().trim();

    res.render('quizzes/result', {
        quiz,
        result,
        answer
    });
};

// GET /quizzes/:quizId/randomplay
exports.randomplay = (req, res, next) => {

    // Array para guardar los id de las preguntas contestadas anteriormente.
    // Usar el almacén de la sesión (req.session) para guardar el estado del juego. Guardarlo en una propiedad como req.session.randomplay.
    // Contendrá el estado del juego configurado en las transacciones anteriores y al modificarlo, 
    // guardará el nuevo estado para que esté disponible en transacciones posteriores. 
    // Use este array para no repetir preguntas y para saber cuantas preguntas se han contestado.

    if(req.session.randomplay === undefined){

      req.session.randomplay = [];  

    } 
    
    Sequelize.Promise.resolve()
    .then(function() {

        // Volver a mostrar la misma pregunta que la ultima vez que pase por aqui y no conteste
        // Como se haria esto?????????

        // Elegir una pregunta al azar no repetida:
        const whereOpt = {'id': {[Sequelize.Op.notIn]: req.session.randomplay}};
        return models.quiz.count({where: whereOpt})
        .then(function (count) {
            return models.quiz.findAll({
                where: whereOpt,
                offset: Math.floor(Math.random() * count),
                limit: 1
            });
        })
        .then(function (quizzes) {
            return quizzes[0];
        });
    })
    .then(function (quiz) {
        const score = req.session.randomplay.length;
        console.log("PUNTUACIONNNNNN PRIMERO" + score);
        if(quiz){
            //req.session.randomplay.lastQuizId = quiz.id;

            // Seguimos jugando.
            res.render('quizzes/random_play', { quiz, score });
            score = score+1;
            console.log("PUNTUACION RANDOM PLAY" + score);
        } else {
            // Hemos acabado.
            delete req.session.randomplay;
            res.render('quizzes/random_nomore', { score });
        }
    })
    .catch(function (error) {
        next(error);
    });
};

// GET + /quizzes/ randomcheck/:quizId?answer=respuesta
exports.randomcheck = (req, res, next) => {

    // req.query o req.body

   const {quiz, query} = req;

    const answer = query.answer || '';

    
    const result = answer.toLowerCase().trim() === quiz.answer.toLowerCase().trim();

    if(result){

        //Lo añado al array de ya contestadas.
        req.session.randomplay.push(quiz.id);
        // redirijo a random_result.
        const score = req.session.randomplay.length;
        console.log("SCOREEEEEEEE" + score);
        res.render('quizzes/random_result', { score, answer, result});
        

    } else {

        // Si es falsa, no la incluye como contestada.
          req.session.randomplay = [];

          const score = req.session.randomplay.length;

          res.render('quizzes/random_result', { score, answer, result });
        }



};
