const { Student, Course } = require("../models");

// TODO: Create an aggregate function to get the number of students overall
const headCount = async () =>
  Student.aggregate([
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
      },
    },
  ]).then((numberOfStudents) => numberOfStudents);

// TODO: Create a function that executes the aggregate method on the Student model and will calculate the overall grade by using the $avg operator
const grade = async (studentId) =>
  Student.aggregate([
    {
      $unwind: "$assignments",
    },
    {
      $group: {
        _id: studentId,
        grade: { $avg: "$assignments.score" },
      },
    },
  ]);

module.exports = {
  // Get all students
  getStudents(req, res) {
    Student.find()
      .then(async (students) => {
        const studentObj = {
          students,
          headCount: await headCount(),
        };
        return res.json(studentObj);
      })
      .catch((err) => {
        console.log(err);
        return res.status(500).json(err);
      });
  },
  // Get a single student
  getSingleStudent(req, res) {
    Student.findOne({ _id: req.params.studentId })
      .select("-__v")
      .lean()
      .then(async (student) =>
        !student
          ? res.status(404).json({ message: "No student with that ID" })
          : res.json({
              student,
              grade: await grade(req.params.studentId),
            })
      )
      .catch((err) => {
        console.log(err);
        return res.status(500).json(err);
      });
  },
  // create a new student
  createStudent(req, res) {
    Student.create(req.body)
      .then((student) => res.json(student))
      .catch((err) => res.status(500).json(err));
  },
  // Delete a student and remove them from the course
  deleteStudent(req, res) {
    Student.findOneAndRemove({ _id: req.params.studentId })
      .then((student) =>
        !student
          ? res.status(404).json({ message: "No such student exists" })
          : Course.findOneAndUpdate(
              { students: req.params.studentId },
              { $pull: { students: req.params.studentId } },
              { new: true }
            )
      )
      .then((course) =>
        !course
          ? res.status(404).json({
              message: "Student deleted, but no courses found",
            })
          : res.json({ message: "Student successfully deleted" })
      )
      .catch((err) => {
        console.log(err);
        res.status(500).json(err);
      });
  },

  // Add an assignment to a student
  addAssignment(req, res) {
    console.log("You are adding an assignment");
    console.log(req.body);
    Student.findOneAndUpdate(
      { _id: req.params.studentId },
      { $addToSet: { assignments: req.body } },
      { runValidators: true, new: true }
    )
      .then((student) =>
        !student
          ? res
              .status(404)
              .json({ message: "No student found with that ID :(" })
          : res.json(student)
      )
      .catch((err) => res.status(500).json(err));
  },
  // Remove assignment from a student
  removeAssignment(req, res) {
    Student.findOneAndUpdate(
      { _id: req.params.studentId },
      { $pull: { assignment: { assignmentId: req.params.assignmentId } } },
      { runValidators: true, new: true }
    )
      .then((student) =>
        !student
          ? res
              .status(404)
              .json({ message: "No student found with that ID :(" })
          : res.json(student)
      )
      .catch((err) => res.status(500).json(err));
  },
  headCount,
};
