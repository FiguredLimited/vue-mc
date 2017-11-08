<template>
    <tr class="task" :class="{done: task.done}">
        <td>
            <el-checkbox v-model="task.done"></el-checkbox>
        </td>
        <td>
            <input class="name" v-model="task.name"></td>
         <td class="buttons">
             <el-button
                    v-show="task.changed()"
                    type="success"
                    icon="el-icon-check"
                    size="small"
                    @click="onSave">{{ saveButtonText }}
            </el-button>
             <el-button
                    type="danger"
                    icon="el-icon-delete"
                    size="small"
                    :loading="task.deleting"
                    @click="onDelete">{{ deleteButtonText }}
            </el-button>
         </td>
    </tr>
</template>

<script>
    export default {
        props: [
            'task'
        ],

        computed: {
            deleteButtonText() {
                return this.task.deleting ? 'Deleting...' : 'Delete';
            },

            saveButtonText() {
                return this.task.saving ? 'Saving...' : 'Save';
            }
        },

        methods: {
            onDelete() {
                this.task.delete().then(() => {
                    this.$message.success("Task deleted successfully");
                }).catch((error) => {
                    this.$message.error("Failed to delete task!");
                });
            },

            onSave() {
                this.task.save().then(() => {
                    this.$message.success("Task saved successfully");
                }).catch((error) => {
                    this.$message.error("Failed to save task!");
                });
            }
        }
    }
</script>

<style lang="scss" scoped>
    input.name {
        border: none;
        padding: 10px 0;
        font-size: 1em;
        outline: none;
    }
    .buttons {
        text-align: right;
    }
</style>
