import express from 'express';

export const AddBundle = (req: express.Request, res: express.Response): void => {
    console.log(req);
    res.json();
}