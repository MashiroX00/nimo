import type { Request, Response } from 'express';
export declare class DockerController {
    static list(_req: Request, res: Response): Promise<void>;
    static create(req: Request, res: Response): Promise<void>;
    static detail(req: Request, res: Response): Promise<void>;
    static update(req: Request, res: Response): Promise<void>;
    static remove(req: Request, res: Response): Promise<void>;
    static start(req: Request, res: Response): Promise<void>;
    static stop(req: Request, res: Response): Promise<void>;
    static restart(req: Request, res: Response): Promise<void>;
    static stats(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=docker.controller.d.ts.map