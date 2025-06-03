import React from 'react';
import { ListGroup } from 'react-bootstrap';

const AttackHistory = ({ events, onSelect }) => {
    console.log("Attack History Events:", events); // Debug log
    return (
        <div className="attack-history">
            <h5>Attack History</h5>
            <ListGroup>
                {events.map((event) => (
                    <ListGroup.Item
                        key={event.id}
                        className="attack-event"
                        onClick={() => onSelect && onSelect(event)}
                        style={{ cursor: onSelect ? 'pointer' : 'default' }}
                    >
                        {event.timestamp.toISOString().split('T')[0]} - {event.type.toUpperCase()} (Intensity: {event.intensity.toFixed(2)} dBm)
                    </ListGroup.Item>
                ))}
            </ListGroup>
        </div>
    );
};

export default AttackHistory;
