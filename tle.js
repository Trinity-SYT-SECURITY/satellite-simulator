import * as satellite from 'satellite.js/lib/index';


export const EarthRadius = 6371;

const rad2Deg = 180 / 3.141592654;

export const parseTleFile = (fileContent, stationOptions) => {
    const result = [];
    const lines = fileContent.split("\n");
    let current = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.length === 0) continue;

        // 檢查是否是TLE行（以行號1或2開頭）
        if (line[0] === '1' && current && current.tle1 === undefined) {
            current.tle1 = line;
        } 
        else if (line[0] === '2' && current && current.tle1) {
            current.tle2 = line;
            // 只有當我們有完整的TLE數據時才添加到結果
            Object.assign(current, stationOptions);
            result.push(current);
            current = null;
        }
        else {
            // 如果不是TLE行，則視為新的衛星名稱
            if (current) {
                console.warn("Incomplete TLE data for:", current.name);
            }
            current = { 
                name: line,
                tle1: undefined,
                tle2: undefined
            };
        }
    }

    if (current) {
        console.warn("Incomplete TLE data at end of file for:", current.name);
    }

    return result;
};


// __ Satellite locations _________________________________________________


const latLon2Xyz = (radius, lat, lon) => {
    var phi   = (90-lat)*(Math.PI/180)
    var theta = (lon+180)*(Math.PI/180)

    const x = -((radius) * Math.sin(phi) * Math.cos(theta))
    const z = ((radius) * Math.sin(phi) * Math.sin(theta))
    const y = ((radius) * Math.cos(phi))

    return { x, y, z };
}

const toThree = (v) => {
    return { x: v.x, y: v.z, z: -v.y };
}

const getSolution = (station, date) => {
    
    if (!station.satrec) {
        const { tle1, tle2 } = station;
        if (!tle1 || !tle2) return null;
        station.satrec = satellite.twoline2satrec(tle1, tle2);;
    }

    return satellite.propagate(station.satrec, date);
}


// type: 1 ECEF coordinates   2: ECI coordinates
export const getPositionFromTle = (station, date, type = 1) => {
    if (!station || !date) {
        console.error("Invalid station or date:", station, date);
        return null;
    }

    try {
        if (!station.satrec) {
            if (!station.tle1 || !station.tle2) {
                console.error("Missing TLE data for station:", station.name);
                return null;
            }
            
            // 增加TLE數據驗證
            if (station.tle1[0] !== '1' || station.tle2[0] !== '2') {
                console.error("Invalid TLE format for station:", station.name);
                return null;
            }
            
            station.satrec = satellite.twoline2satrec(station.tle1, station.tle2);
            
            if (!station.satrec) {
                console.error("Failed to parse TLE for station:", station.name);
                return null;
            }
        }

        const positionVelocity = satellite.propagate(station.satrec, date);
        
        if (!positionVelocity || !positionVelocity.position) {
            console.warn("Propagation failed for station:", station.name, "at", date);
            return null;
        }

        const positionEci = positionVelocity.position;
        if (type === 2) return [toThree(positionEci), positionEci];

        const gmst = satellite.gstime(date);
        if (!gmst && gmst !== 0) {
            console.warn("Invalid GMST calculation for date:", date);
            return null;
        }

        const positionEcf = satellite.eciToEcf(positionEci, gmst);
        return [toThree(positionEcf), positionEci];
    } catch (error) {
        console.error("Error calculating position for station:", station.name, error);
        return null;
    }
}; 

export const getPositionFromGroundCoords = (lat, long, height) => {
    var observerGd = {
        longitude: satellite.degreesToRadians(long),
        latitude: satellite.degreesToRadians(lat),
        height: height
    }
    const pos = satellite.geodeticToEcf(observerGd)
    return [toThree(pos), observerGd];
}
