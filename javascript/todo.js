var todoList = (function() {
  var storage = {
    get: function() {
      var todos =  JSON.parse(localStorage.getItem("todos")) || [];
      todos.forEach(function(todo) {
        Object.setPrototypeOf(todo, Todo.prototype);
      });
      return todos;
    },
    set: function() {
      localStorage.setItem("todos", JSON.stringify(todoList.todos));
    },
  }

  return {
    init: function() {
      this.todos = storage.get();
    },
    saveTodos: function() {
      storage.set();
    },
    addTodo: function(title, day, month, year, description) {
      this.todos.push(new Todo(this.nextId(), title, day, month, year, description));
      this.saveTodos();
    },
    nextId: function() {
      return this.todos.reduce(function(highest, todo) {
        return highest > todo.id ? highest : todo.id;
      }, 0) + 1;
    },
    query: function(category, done) {
      var results;
      
      if (category === 'all') {
        results = this.todos;
      } else {
        results = this.todos.filter(function(todo) {
          return todo.category === category;
        });
      }

      if (done) {
        results = results.filter(function(todo) {
          return todo.done;
        });
      }
      return this.sortTodos(results);
    },
    queryId: function(id) {
      return this.todos.find(function(todo) {
        return todo.id === id;
      });
    },
    sortTodos: function(todos) {
      return todos.sort(function(a, b) {
        if (a.done && b.done == false) { return 1 };
        if (a.done == false && b.done) { return -1 };
        return 0;
      });
    },
    deleteTodo: function(id) {
      var index = this.todos.indexOf(this.queryId(id));
      this.todos.splice(index, 1);
      this.saveTodos();
    },
    editTodo: function(id, title, day, month, year, description) {
      var todo = this.queryId(id);
      todo.title = title;
      todo.day = day;
      todo.month = month;
      todo.year = year;
      todo.description = description;
      todo.getCategory();
      this.saveTodos();
    },
    toggleTodoDone: function(id) {
      this.queryId(id).toggleDone();
      this.saveTodos();
    }
  }
})()

function Todo(id, title, day, month, year, description) {
  this.id = id;
  this.title = title;
  this.day = ("0" + day).slice(-2);
  this.month = ("0" + month).slice(-2);
  this.year = year;
  this.description = description;
  this.getCategory();
  this.correctDates();
}

Todo.prototype = {
  constructor: Todo,
  done: false,
  getCategory: function() {
    var category = "No Due Date";
    if (this.month && this.year) {
      category = this.month + "/" + this.year
    };
    this.category = category;
  },
  toggleDone: function() {
    this.done = this.done ? false : true;
  },
  correctDates: function() {
    if (this.month == "0") {this.month = undefined};
    if (this.day == "0") {this.day = undefined}; 
  },
}

var page = {
  init: function() {
    this.elements = this.getElements();
    this.currentCategory = {heading: 'All Todos', category: 'all', done: false};
    this.setupTemplates();
    this.setupPartials();
    this.setupHelpers();
    this.renderMain();
    this.renderNav();
    this.setupBindings();
  },
  setupTemplates: function() {
    var templates = {};
    $("script[type='text/x-handlebars']").each(function() {
      var $template = $(this);
      templates[$template.attr("name")] = Handlebars.compile($template.html());
    });
    this.templates = templates;
  },
  setupPartials: function() {
    $("script[data-type='partial']").each(function() {
      var $partial= $(this);
      Handlebars.registerPartial($partial.attr("name"), $partial.html());
    });
  },
  setupHelpers: function() {
    Handlebars.registerHelper('todoCount', function() {
      return todoList.todos.length;
    });

    Handlebars.registerHelper('todoCompletedCount', function() {
      return todoList.query("all", true).length;
    });
  },
  getElements: function() {
    return {
      nav: $("nav"),
      categoriesAll: $("#dateCategories"),
      categoriesDone: $("#dateCategoriesCompleted"),
      categoryLists: $("nav ul"),
      mainHeading: $("main header h1"),
      mainBadge: $("main header span"),
      mainTodoList: $("#todos"),
      modal: $("#modal"),
      form: $("#form"),
      formId: $("#todoId"),
      formTitle: $("#title"),
      formDay: $("#day"),
      formMonth: $("#month"),
      formYear: $("#year"),
      formDescription: $("#description"),
      formSave: $("#form :submit"),
      formComplete: $("#form :button"),
    }
  },
  renderMain: function() {
    var heading = this.currentCategory.heading || this.currentCategory.category;
    var category = this.currentCategory.category;
    var done = this.currentCategory.done;
    var todos = todoList.query(category, done);
    
    this.elements.mainHeading.text(heading);
    this.elements.mainBadge.text(todos.length);
    this.elements.mainTodoList.html(this.templates.todoList({todos: todos}))
  },
  renderNav: function() {
    this.renderCategoriesAll();
    this.renderCategoriesDone();
    this.styleActiveCategory();
  },
  renderCategoriesAll: function() {
    var categories = todoList.query("all").map(function(todo) {return todo.category});
    categories = removeDuplicatesFromArray(categories);
    categories = this.sortCategories(categories);
    categories = this.getCategoryCountObject(categories, false);
    this.elements.categoriesAll.html(this.templates.dateCategories({categories: categories}));
  },
  renderCategoriesDone: function() {
    var categories = todoList.query("all", true).map(function(todo) {return todo.category});
    categories = removeDuplicatesFromArray(categories);
    categories = this.sortCategories(categories);
    categories = this.getCategoryCountObject(categories, true);
    this.elements.categoriesDone.html(this.templates.dateCategoriesCompleted({categories: categories}));
  },
  sortCategories: function(array) {
    if (array.indexOf("No Due Date") != -1) {
      var index = array.indexOf("No Due Date");
      var containsNoDueDate = true;
      array.splice(index, 1);
    };
    array = array.sort(function(a, b) {
      a = a.split("/");
      b = b.split("/");
      if (a[1] > b[1]) { return 1 };
      if (a[1] < b[1]) { return -1 };
      if (a[1] === b[1]) { 
        if (a[0] > b[0]) { return 1 }
        if (a[0] < b[0]) { return -1 }
      };
      return 0;
    })
    if (containsNoDueDate) {array.unshift("No Due Date")};
    return array;
  },
  getCategoryCountObject: function(categories, done) {
    var results = [];
    categories.forEach(function(category) {
      results.push({
        category: category, 
        count: todoList.query(category, done).length,
        done: done,
      });
    })
    return results;
  },
  setupBindings: function() {
    this.elements.mainTodoList.on("click", "li", this.markTodoDone.bind(this));
    this.elements.mainTodoList.on("click", "a", this.displayModal.bind(this));
    this.elements.modal.on("click", this.hideModal.bind(this));
    this.elements.formSave.on("click", this.saveForm.bind(this));
    this.elements.formComplete.on("click", this.modalMarkDone.bind(this));
    this.elements.form.on("click", this.formStopProp.bind(this));
    this.elements.mainTodoList.on("click", "dd", this.deleteTodo.bind(this));
    this.elements.categoryLists.on("click", "a", this.selectCategory.bind(this));
  },
  styleActiveCategory: function() {
    var categorySelector = "[data-category='" + this.currentCategory.category + "']";
    var doneSelector = "[data-done='" + this.currentCategory.done + "']";
    var query = "nav li" + categorySelector + doneSelector;
    $("nav li a").removeClass("active").find("span").removeClass("badge-selected");;
    $(query).find("a").addClass('active').find("span").addClass("badge-selected");
  },
  selectCategory: function(e) {
    e.preventDefault();
    $element = $(e.currentTarget).closest("li");
    this.currentCategory = {
      heading: $element.find("dt").text(),
      category: $element.data("category"), 
      done: $element.data("done"), 
    }
    this.styleActiveCategory();
    this.renderMain();
  },
  markTodoDone: function(e) {
    e.stopPropagation();
    $element = $(e.currentTarget);
    if ($element.attr('id') == 'new') {return}
    todoList.toggleTodoDone(+$element.data("id"));
    this.renderMain();
    this.renderNav();
  },
  deleteTodo: function(e) {
    e.stopPropagation();
    $element = $(e.currentTarget);
    var id = +$element.closest("li").data("id");
    todoList.deleteTodo(id);
    this.renderMain();
    this.renderNav();
  },
  saveForm: function(e) {
    e.preventDefault();
    var values = this.getFormValues();
    if (todoList.queryId(+values.id)) {
      todoList.editTodo(+values.id, values.title, values.day, values.month, values.year, values.description);
    } else {
      todoList.addTodo(values.title, values.day, values.month, values.year, values.description);
    }
    this.hideModal();
    if (+values.id === 0) {
      this.currentCategory = {heading: 'All Todos', category: 'all', done: false};
    }
    this.renderMain();
    this.renderNav();
  },
  modalMarkDone: function(e) {
    var id = +this.getFormValues().id;
    if (id == 0) {
      alert("You must save a todo before you can mark it as complete");
    } else {
      if (!todoList.queryId(+id).done) {
        todoList.toggleTodoDone(+id);
      }
      this.hideModal();
      this.renderMain();
    }
  },
  setFormValues: function(id) {
    var todo = todoList.queryId(id) || { id: 0 }
    this.elements.formId.val(todo.id);
    this.elements.formTitle.val(todo.title);
    this.elements.formDay.val(todo.day);
    this.elements.formMonth.val(todo.month);
    this.elements.formYear.val(todo.year);
    this.elements.formDescription.val(todo.description);
  },
  getFormValues: function() {
    return {
      id: this.elements.formId.val(),
      title: this.elements.formTitle.val(),
      day: this.elements.formDay.val(),
      month: this.elements.formMonth.val(),
      year: this.elements.formYear.val(),
      description: this.elements.formDescription.val(),
    }
  },
  displayModal: function(e) {
    e.stopPropagation();
    e.preventDefault();
    $element = $(e.currentTarget);
    var id = +$element.closest("li").data("id");
    this.elements.modal.fadeIn(700);
    this.setFormValues(id);
  },
  hideModal: function(e) {
    this.elements.modal.fadeOut(700);
    this.elements.formComplete.val("Mark as Complete");
    this.elements.formComplete.css('background', '#148fd5');
  },
  formStopProp: function(e) {
    e.stopPropagation();
  },
}

$(function() {
  todoList.init();
  page.init();
})

function removeDuplicatesFromArray(array) {
  return array.filter(function(el, index) {
    return array.indexOf(el) === index;
  });
}



