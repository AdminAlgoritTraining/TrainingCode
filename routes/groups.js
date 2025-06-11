const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { teacherOnly } = require('../middleware/teacher');
const {
    createGroup,
    getTeacherGroups,
    addStudentToGroup,
    removeStudentFromGroup,
    getGroupStudents
} = require('../controllers/groups');

router.use(protect);

router.post('/', teacherOnly, createGroup);
router.get('/teacher', teacherOnly, getTeacherGroups);
router.post('/:groupId/students', teacherOnly, addStudentToGroup);
router.delete('/:groupId/students/:studentId', teacherOnly, removeStudentFromGroup);
router.get('/:groupId/students', teacherOnly, getGroupStudents);

module.exports = router;