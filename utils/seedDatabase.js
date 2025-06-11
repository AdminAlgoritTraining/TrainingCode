
const { sequelize } = require('../config/database');
const { User, Exercise } = require('../models');

// Datos de ejercicios de ejemplo
const exercises = [
  {
    title: 'Invertir una lista',
    description: 'Crea una función llamada `invertirLista` que reciba una lista como parámetro y devuelva una nueva lista con los elementos en orden inverso.',
    category: 'lists',
    difficulty: 'Fácil',
    xpReward: 20,
    initialCode: `function invertirLista(lista) {
  // Tu código aquí
  
}

// Ejemplos de uso (no modificar)
console.log(invertirLista([1, 2, 3, 4, 5])); // Debería imprimir: [5, 4, 3, 2, 1]
console.log(invertirLista(['a', 'b', 'c'])); // Debería imprimir: ['c', 'b', 'a']
console.log(invertirLista([])); // Debería imprimir: []`,
    solution: `function invertirLista(lista) {
  const resultado = [];
  for (let i = lista.length - 1; i >= 0; i--) {
    resultado.push(lista[i]);
  }
  return resultado;
}`,
    order: 1
  },
  {
    title: 'Eliminar duplicados',
    description: 'Implementa una función que elimine los elementos duplicados de una lista.',
    category: 'lists',
    difficulty: 'Fácil',
    xpReward: 25,
    initialCode: `function eliminarDuplicados(lista) {
  // Tu código aquí
  
}

// Ejemplos de uso
console.log(eliminarDuplicados([1, 2, 2, 3, 4, 4, 5])); // Debería imprimir: [1, 2, 3, 4, 5]
console.log(eliminarDuplicados(['a', 'b', 'a', 'c', 'c'])); // Debería imprimir: ['a', 'b', 'c']`,
    solution: `function eliminarDuplicados(lista) {
  return [...new Set(lista)];
}`,
    order: 2
  },
  {
    title: 'Implementar una pila',
    description: 'Crea una clase Pila con métodos push, pop, peek e isEmpty',
    category: 'stacks',
    difficulty: 'Fácil',
    xpReward: 25,
    initialCode: `class Pila {
  // Tu código aquí
  
}

// Ejemplos de uso (no modificar)
const pila = new Pila();
console.log(pila.isEmpty()); // Debería imprimir: true
console.log(pila.size()); // Debería imprimir: 0

pila.push(1);
pila.push(2);
pila.push(3);
console.log(pila.size()); // Debería imprimir: 3
console.log(pila.isEmpty()); // Debería imprimir: false
console.log(pila.peek()); // Debería imprimir: 3

console.log(pila.pop()); // Debería imprimir: 3
console.log(pila.size()); // Debería imprimir: 2
console.log(pila.peek()); // Debería imprimir: 2`,
    solution: `class Pila {
  constructor() {
    this.elementos = [];
  }
  
  push(elemento) {
    this.elementos.push(elemento);
  }
  
  pop() {
    if (this.isEmpty()) {
      return null;
    }
    return this.elementos.pop();
  }
  
  peek() {
    if (this.isEmpty()) {
      return null;
    }
    return this.elementos[this.elementos.length - 1];
  }
  
  isEmpty() {
    return this.elementos.length === 0;
  }
  
  size() {
    return this.elementos.length;
  }
}`,
    order: 1
  }
];

// Función para sembrar la base de datos
const seedDatabase = async () => {
  try {
    // Sincronizar modelos (esto creará las tablas)
    await sequelize.sync({ force: true });
    console.log('Base de datos sincronizada');

    // Crear ejercicios
    await Exercise.bulkCreate(exercises);
    console.log('Ejercicios de ejemplo creados');

    // Crear un usuario de prueba
    await User.create({
      username: 'usuario_test',
      email: 'test@ejemplo.com',
      password: 'password123',
      level: 1,
      xp: 0,
      streak: 0
    });
    console.log('Usuario de prueba creado');

    console.log('¡Base de datos inicializada con éxito!');
  } catch (error) {
    console.error('Error al sembrar la base de datos:', error);
  } finally {
    process.exit();
  }
};

// Ejecutar la función
seedDatabase();