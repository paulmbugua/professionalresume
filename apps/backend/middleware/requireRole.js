const RoleOrder = { student:0, tutor:1, admin:2, superadmin:3 };

export function requireRole(minRole = 'admin') {
  return (req, res, next) => {
    const role = (req.adminRole || req.user?.role || '').toLowerCase();
    if (!(minRole in RoleOrder) || !(role in RoleOrder)) return res.sendStatus(403);
    if (RoleOrder[role] < RoleOrder[minRole]) return res.sendStatus(403);
    return next();
  };
}
