export function getDefaultRouteByRole(role) {
  switch (String(role || '').toLowerCase()) {
    case 'admin':
      return '/admin';
    case 'sales':
      return '/sales/orders';
    case 'farm_staff':
      return '/farm/seasons';
    case 'customer':
    default:
      return '/';
  }
}
