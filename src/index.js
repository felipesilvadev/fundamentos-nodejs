const express = require('express');
const { v4: uuidv4 } = require('uuid');

const PORT = 3333;
const app = express();

app.use(express.json());

const customers = [];

function verifyIfExistsAccount(request, response, next) {
  const { cpf } = request.headers;

  const customer = customers.find(customer => customer.cpf === cpf);

  if (!customer) {
    return response.status(404).json({ error: 'Customer not found' });
  }

  request.customer = customer;

  return next();
}

function getBalance(statement) {
  const balance = statement.reduce((balance, operation) => {
    if (operation.type === 'credit') {
      return balance + operation.amount;
    }

    return balance - operation.amount;
  }, 0);

  return balance;
}

app.post('/account', (request, response) => {
  const { cpf, name } = request.body;

  const customerAlreadyExists = customers.some(customer => customer.cpf === cpf);

  if (customerAlreadyExists) {
    return response.status(400).json({ error: 'Customer already exists' });  
  }

  customers.push({
    id: uuidv4(),
    cpf,
    name,
    statement: [],
  });

  return response.status(201).json({ message: 'Account successfully created' });
});

app.use(verifyIfExistsAccount);

app.get('/statement', (request, response) => {
  const { customer } = request;

  return response.json(customer.statement);
});

app.get('/statement/date', (request, response) => {
  const { customer } = request;
  const { date } = request.query; 

  const dateFormat = new Date(date + " 00:00");

  const statements = customer.statement.filter(operation => {
    return operation.created_at.toDateString() === dateFormat.toDateString();
  });

  return response.json(statements);
});

app.post('/deposit', (request, response) => {
  const { customer } = request;
  const { description, amount } = request.body;

  const statementOperation = {
    description,
    amount,
    created_at: new Date(),
    type: 'credit',
  };

  customer.statement.push(statementOperation);

  return response.status(201).json({ message: 'Deposit successful'})
});

app.post('/withdraw', (request, response) => {
  const { customer } = request;
  const { amount } = request.body;

  const balance = getBalance(customer.statement);

  if (balance < amount) {
    return response.status(400).json({ error: 'Insufficient funds' });
  }

  const statementOperation = {
    amount,
    created_at: new Date(),
    type: 'debit',
  };

  customer.statement.push(statementOperation);

  return response.status(201).json({ message: 'Withdraw successful'})
});

app.patch('/account', (request, response) => {
  const { customer } = request;
  const { name } = request.body;

  customer.name = name;

  return response.status(201).json({ message: 'Account updated successfully' });
});

app.get('/account', (request, response) => {
  const { customer } = request;

  return response.json(customer);
});

app.delete('/account', (request, response) => {
  const { customer } = request;

  customers.splice(customer, 1);

  // return response.status(204).json({ message: 'Account deleted successfully' });
  return response.status(200).json(customers);
});

app.get('/balance', (request, response) => {
  const { customer } = request;

  const balance = getBalance(customer.statement);

  return response.json({ balance });
});

app.listen(PORT, () => console.log(`🚀 Server started on port ${PORT}`));