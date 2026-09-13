const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');

// Get all roles with their permissions
// @route   GET api/roles
// @desc    Get all roles and their permissions
// @access  Admin only
router.get('/', protect, checkPermission('viewAllRoles'), roleController.getAllRoles);

// Get permissions for a specific role
// @route   GET api/roles/:role
// @desc    Get permissions for a specific role
// @access  Admin only
router.get('/:role', protect, checkPermission('viewRolePermissions'), roleController.getRolePermissions);

// Create a new role with permissions
// @route   POST api/roles
// @desc    Create a new role with permissions
// @access  Admin only
router.post('/', protect, checkPermission('createRole'), roleController.createRole);

// Update permissions for an existing role
// @route   PUT api/roles/:role
// @desc    Update permissions for an existing role
// @access  Admin only
router.put('/:role', protect, checkPermission('updateRolePermissions'), roleController.updateRolePermissions);

// Delete a role
// @route   DELETE api/roles/:role
// @desc    Delete a role
// @access  Admin only
router.delete('/:role', protect, checkPermission('deleteRole'), roleController.deleteRole);

// Assign a role to a member
// @route   POST api/roles/assign
// @desc    Assign a role to a member
// @access  Admin only
router.post('/assign', protect, checkPermission('assignRoleToMember'), roleController.assignRoleToMember);

// Get a member's role and permissions
// @route   GET api/roles/member/:memberId
// @desc    Get a member's role and permissions
// @access  Admin only
router.get('/member/:memberId', protect, checkPermission('viewMemberRoleAndPermissions'), roleController.getMemberRoleAndPermissions);

module.exports = router;