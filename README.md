+ https://github.com/dsuarezv/satellite-tracker/tree/master

The original development project comes from, thanks to their contribution, based on their project, this project extends and develops more functions to present satellite attack situations
+ https://github.com/deptofdefense/satellite-jamming-simulator

![image](https://github.com/user-attachments/assets/c5da0971-4fa7-4505-bd04-e435631c4672)

Satellite data source https://celestrak.org/

---- 

Ref

+ https://www.youtube.com/watch?v=t_efCpd2PbM

----

## Running the App
This is a static client-side javascript implementation. Running it should just be a matter of:
```bash
npm install
npm run start
```

creat .env
```
REACT_APP_GOOGLE_AI_API_KEY=AIXXXX
REACT_APP_GOOGLE_AI_MODEL=gemini-2.0-flash
```
+ get from https://aistudio.google.com/apikey
  + is free

This has been tested with `node v18.4.0`, your mileage may vary with other versions.

## Making Modifications
Most of the relevant physical modeling implementation is contained in `engine.js` or `tle.js`. Most of the UI is implemented directly in `App.js`.

## Future features

+ More realistic attack presentation
+ Add more attacks
+ Solve data retrieval issues
+ Add AI analysis features


