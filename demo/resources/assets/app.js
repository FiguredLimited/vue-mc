import Vue from 'vue'
import ElementUI from 'element-ui'
import locale from 'element-ui/lib/locale/lang/en'
import 'element-ui/lib/theme-chalk/index.css'

import TaskList from './components/TaskList.vue'
import Task     from './components/Task.vue'

Vue.component('task-list', TaskList);
Vue.component('task', Task);

Vue.use(ElementUI, {locale});

new Vue({
    el: '#app',
});
