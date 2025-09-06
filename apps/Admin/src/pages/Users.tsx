import React from 'react';

export default function Users() {
  const rows = [
    { id: 22, email: 'paulpep2002@gmail', tokens: 37 },
    { id: 18, email: 'student@db.com', tokens: 12 },
  ];
  return (
    <div className="space-y-4">
      <h3 className="app-heading">Users</h3>
      <div className="panel overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 dark:bg-white/10">
            <tr>
              <th className="text-left p-3">ID</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Tokens</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t border-gray-200 dark:border-white/10">
                <td className="p-3">{r.id}</td>
                <td className="p-3">{r.email}</td>
                <td className="p-3">{r.tokens}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
