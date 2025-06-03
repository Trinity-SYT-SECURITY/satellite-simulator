import React from 'react';
import { ProgressBar, Card, Table } from 'react-bootstrap';

const AttackAnalysis = ({ defenderPower, attackerPower, sinr, effectiveness, attackType }) => {
    const getAttackDescription = () => {
        switch(attackType) {
            case 'power':
                return "Power jamming attempts to overwhelm the target receiver with high-power signals on the same frequency.";
            case 'frequency':
                return "Frequency jamming targets specific frequency bands to disrupt communications.";
            case 'spoofing':
                return "Spoofing attacks mimic legitimate signals to deceive the target system.";
            case 'dos':
                return "Denial of Service floods the target with excessive requests or packets.";
            default:
                return "";
        }
    };

    const getMitigationStrategies = () => {
        switch(attackType) {
            case 'power':
                return [
                    "Use directional antennas",
                    "Implement power control mechanisms",
                    "Deploy frequency hopping"
                ];
            case 'frequency':
                return [
                    "Use spread spectrum techniques",
                    "Implement frequency agility",
                    "Deploy cognitive radio"
                ];
            case 'spoofing':
                return [
                    "Implement strong authentication",
                    "Use cryptographic signatures",
                    "Deploy signal fingerprinting"
                ];
            case 'dos':
                return [
                    "Implement rate limiting",
                    "Use traffic filtering",
                    "Deploy redundancy"
                ];
            default:
                return [];
        }
    };

    return (
        <Card className="mb-3">
            <Card.Header className="h4">Attack Analysis</Card.Header>
            <Card.Body>
                <h5>Attack Type: {attackType.toUpperCase()}</h5>
                <p>{getAttackDescription()}</p>
                
                <h5 className="mt-3">Effectiveness</h5>
                <ProgressBar 
                    now={effectiveness} 
                    label={`${effectiveness}%`} 
                    variant={effectiveness > 70 ? 'danger' : effectiveness > 40 ? 'warning' : 'success'}
                    className="mb-3"
                />
                
                <h5>Signal Metrics</h5>
                <Table striped bordered>
                    <tbody>
                        <tr>
                            <td>Defender Signal Power</td>
                            <td>{defenderPower.toFixed(2)} dBm</td>
                        </tr>
                        <tr>
                            <td>Attacker Signal Power</td>
                            <td>{attackerPower.toFixed(2)} dBm</td>
                        </tr>
                        <tr>
                            <td>Signal-to-Interference-plus-Noise Ratio (SINR)</td>
                            <td>{sinr.toFixed(2)} dB</td>
                        </tr>
                    </tbody>
                </Table>
                
                <h5 className="mt-3">Recommended Mitigation Strategies</h5>
                <ul className="mitigation-list"> {/* Added custom class */}
                    {getMitigationStrategies().map((strategy, index) => (
                        <li key={index}>{strategy}</li>
                    ))}
                </ul>
            </Card.Body>
        </Card>
    );
};

export default AttackAnalysis;
