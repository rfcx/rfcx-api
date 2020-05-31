/**
 * @swagger
 *
 * /streams:
 *   get:
 *     summary: Get list of streams (not yet implemented)
 *     description:
 *     tags:
 *       - streams
 *     parameters:
 *       - name: access
 *         description: Limit to streams `private`, `shared`
 *         in: query
 *         type: string
 *     responses:
 *       200:
 *         description: List of stream (lite) objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *       400:
 *         description: Invalid query parameters
 */
