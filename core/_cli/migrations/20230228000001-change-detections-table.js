'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    const type = queryInterface.sequelize.QueryTypes.RAW
    return Promise.resolve().then(() => {
      return queryInterface.sequelize.query('ALTER TABLE "detections" RENAME TO "detections_old";')
    }).then(() => {
      return queryInterface.sequelize.query('CREATE SEQUENCE detections_id_seq INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1;', { type })
    }).then(() => {
      return queryInterface.sequelize.query(`
        CREATE TABLE IF NOT EXISTS public.detections
        (
            id bigint NOT NULL DEFAULT nextval('detections_id_seq'::regclass),
            start timestamp with time zone NOT NULL,
            "end" timestamp with time zone NOT NULL,
            stream_id character varying(12) COLLATE pg_catalog."default" NOT NULL,
            classification_id integer NOT NULL,
            classifier_id integer NOT NULL,
            classifier_job_id integer DEFAULT NULL,
            confidence double precision NOT NULL,
            review_status smallint DEFAULT NULL,
            CONSTRAINT detections2_classifier_id_fkey FOREIGN KEY (classifier_id)
                REFERENCES public.classifiers (id) MATCH SIMPLE
                ON UPDATE NO ACTION
                ON DELETE NO ACTION,
            CONSTRAINT detections2_stream_id_fkey FOREIGN KEY (stream_id)
                REFERENCES public.streams (id) MATCH SIMPLE
                ON UPDATE NO ACTION
                ON DELETE NO ACTION,
            CONSTRAINT detections_classification_id_fkey FOREIGN KEY (classification_id)
                REFERENCES public.classifications (id) MATCH SIMPLE
                ON UPDATE NO ACTION
                ON DELETE NO ACTION,
            CONSTRAINT detections_classifier_job_id_fkey FOREIGN KEY (classifier_job_id)
                REFERENCES public.classifiers (id) MATCH SIMPLE
                ON UPDATE NO ACTION
                ON DELETE NO ACTION
        )
      `, { type })
    }).then(() => {
      return queryInterface.sequelize.query('SELECT create_hypertable(\'detections\', \'start\')', {
        type: queryInterface.sequelize.QueryTypes.RAW
      })
    }).then(() => {
      return queryInterface.sequelize.query('CREATE INDEX detections_stream_id_start_confidence_review_status ON detections USING btree (stream_id, start, confidence, review_status)', {
        type: queryInterface.sequelize.QueryTypes.RAW
      })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('detections')
  }
}
