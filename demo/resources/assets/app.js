import Vue from 'vue'
import ElementUI from 'element-ui'
import locale from 'element-ui/lib/locale/lang/en'
import 'element-ui/lib/theme-chalk/index.css'

Vue.component('task-list', require('./components/TaskList.vue'));
Vue.component('task', require('./components/Task.vue'));

Vue.use(ElementUI, {locale});

new Vue({
    el: '#app',
});
