import React from 'react';

const AttackHistory = ({ events, defenseHistory, onSelect }) => {
  return (
    <div className="card">
      <div className="card-header h4">Attack History</div>
      <div className="card-body">
        <ul className="list-group">
          {events.map((event) => (
            <li
              key={event.id}
              className="list-group-item"
              onClick={() => onSelect(event)}
              style={{ cursor: 'pointer' }}
            >
              <strong>{new Date(event.timestamp).toLocaleString()}</strong>: {event.type} attack on {event.target.name}
              <br />
              Intensity: {event.intensity}%, Effectiveness: {event.effectiveness !== undefined ? `${event.effectiveness}%` : 'N/A'}, Result: {event.result || 'Unknown'}
            </li>
          ))}
        </ul>
        <h5 className="mt-3">Defense History</h5>
        <ul className="list-group">
          {defenseHistory.map((defense) => (
            <li key={defense.id} className="list-group-item">
              {new Date(defense.timestamp).toLocaleString()}: {defense.actions.join(', ')}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AttackHistory;
