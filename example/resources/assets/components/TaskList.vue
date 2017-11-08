<template>
    <div>
        <h1>Task List</h1>

        <!-- CREATE TASK -->
        <el-form>
          <el-form-item label="Name" :error="task.errors.name">
            <el-input v-model="task.name" ref="name" autofocus placeholder="Name"></el-input>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="onCreate" :loading="task.saving">
                {{ createButtonText }}
            </el-button>
          </el-form-item>
        </el-form>

        <template v-if="tasks.length">
            <hr>

            <!-- TASK TABLE -->
            <table class="tasks">
                <thead>
                    <th width="50"></th>
                    <th>Name</th>
                    <th width="200"></th>
                </thead>
                <tbody>
                    <task v-for="task in tasks.models"
                          :key="task.id"
                          :task="task"
                          @delete="onDelete(task)">
                    </task>
                </tbody>
            </table>

            <!-- RESET BUTTON -->
            <div>
                <el-button
                        type="info"
                        icon="el-icon-back"
                        size="small"
                        @click="tasks.reset()">
                    Reset
                </el-button>
            </div>
            <hr>

            <!-- PROGRESS -->
            <el-progress :percentage="tasks.progress" :status="status"></el-progress>
        </template>
    </div>
</template>

<script>
    import TaskCollection from '../collections/TaskCollection'
    import Task from '../models/Task'
    import _ from 'lodash';

    export default {
        data() {
            let tasks = new TaskCollection();
            let task = new Task({}, tasks); // <-- Register the collection

            return {tasks, task};
        },

        mounted() {
            this.tasks.fetch().then(() => {
                this.$message.success("Fetched!");
            });
        },

        computed: {
            status() {
                if (this.tasks.progress === 100) {
                    return 'success';
                }
            },

            createButtonText() {
                return this.task.saving ? 'Creating...' : 'Create';
            }
        },

        methods: {
            onCreate() {
                this.task.save().then(() => {
                    this.task = new Task({}, this.tasks);
                    this.$message.success("Task created successfully");
                }).catch((error) => {
                    this.$message.error("Failed to create task!");
                });
            },
        },
    }
</script>

<style lang="scss" scoped>
    hr {
        padding: 0;
        margin: 20px 0;
        border: none;
        border-top: 1px solid #ddd;
    }

    .tasks {
        margin-bottom: 20px;
        width: 100%;
        th {
            text-align: left;
        }
    }

    .buttons {
        text-align: right;
    }
</style>
