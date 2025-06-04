import React, { useEffect, useRef } from 'react';
import { ListGroup, Badge } from 'react-bootstrap';

const AttackHistory = ({ events, defenseHistory, onSelect }) => {
  const getDefenseForAttack = (attackId) => {
    return defenseHistory.find(defense => defense.attackId === attackId) || null;
  };

  const listRef = useRef(null);

  // 自動滾動到最新事件
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [events]);

  return (
    <div className="attack-history card">
      <div className="card-header h4">Attack & Defense History</div>
      <div className="card-body" style={{ maxHeight: '300px', overflowY: 'auto' }} ref={listRef}>
        <ListGroup>
          {events.map((event, index) => {
            const defense = getDefenseForAttack(event.id);
            const badgeVariant = event.result === 'Blocked' ? 'success' : event.result === 'Partially Blocked' ? 'warning' : 'danger';
            const isLatest = index === events.length - 1;

            return (
              <ListGroup.Item
                key={event.id}
                action
                onClick={() => onSelect(event)}
                className={`mb-2 ${isLatest ? 'bg-light' : ''}`}
              >
                <div>
                  <strong>Attack:</strong> {event.type} at {new Date(event.timestamp).toLocaleString()}
                  <Badge bg={badgeVariant} className="ms-2">{event.result}</Badge>
                </div>
                <div>Effectiveness: {event.effectiveness.toFixed(1)}%</div>
                {defense && (
                  <div className="mt-1 text-muted">
                    <strong>Defense:</strong> {defense.actions.join(', ')}
                  </div>
                )}
              </ListGroup.Item>
            );
          })}
        </ListGroup>
      </div>
    </div>
  );
};

export default AttackHistory;
