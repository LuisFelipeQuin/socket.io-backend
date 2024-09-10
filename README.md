======================DOCUMENTATION======================


-- -- WEBSOCKETS -- -- 

-- when using websockets we had an issue using something like this

    req.io.emit('userRemovedFromRoom', { room_id, user_id });

but now that we use 

    req.io.emit('userEnteredRoom', room);

works fine. so it seems to be that the information sent to the front-end was not enough.

