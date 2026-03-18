import {
  getModerationQueue,
  getModerationDetail,
  getModerationMetrics,
  getModerationHistory,
  approveTour,
  rejectTour,
  sendBackForRevision,
  addReviewComment,
  getQueueItemIds,
} from '../moderation';

describe('moderation API', () => {
  describe('getModerationQueue', () => {
    it('should return queue sorted with resubmissions first', async () => {
      const queue = await getModerationQueue();
      expect(queue.length).toBeGreaterThan(0);
      const resubIdx = queue.findIndex((item) => item.isResubmission);
      const pendingIdx = queue.findIndex((item) => !item.isResubmission);
      if (resubIdx >= 0 && pendingIdx >= 0) {
        expect(resubIdx).toBeLessThan(pendingIdx);
      }
    });

    it('should have required fields on each item', async () => {
      const queue = await getModerationQueue();
      queue.forEach((item) => {
        expect(item.id).toBeTruthy();
        expect(item.tourTitle).toBeTruthy();
        expect(item.guideName).toBeTruthy();
        expect(item.city).toBeTruthy();
        expect(item.submissionDate).toBeTruthy();
        expect(item.status).toBeTruthy();
      });
    });
  });

  describe('getModerationDetail', () => {
    it('should return detail for valid moderation ID', async () => {
      const detail = await getModerationDetail('mod-1');
      expect(detail).not.toBeNull();
      expect(detail!.tourTitle).toBe('Les Parfums Modernes');
      expect(detail!.pois.length).toBeGreaterThan(0);
      expect(detail!.description).toBeTruthy();
    });

    it('should return null for unknown ID', async () => {
      const detail = await getModerationDetail('nonexistent');
      expect(detail).toBeNull();
    });

    it('should include guide submission stats', async () => {
      const detail = await getModerationDetail('mod-1');
      expect(detail!.guideSubmissionCount).toBeGreaterThan(0);
      expect(typeof detail!.guideApprovalRate).toBe('number');
    });

    it('should flag first-time guide', async () => {
      const detail = await getModerationDetail('mod-3');
      expect(detail!.isFirstSubmission).toBe(true);
    });

    it('should include FR and EN text for POIs', async () => {
      const detail = await getModerationDetail('mod-1');
      detail!.pois.forEach((poi) => {
        expect(poi.descriptionFr).toBeTruthy();
        expect(poi.descriptionEn).toBeTruthy();
        expect(poi.wordCountFr).toBeGreaterThan(0);
        expect(poi.wordCountEn).toBeGreaterThan(0);
      });
    });
  });

  describe('getModerationMetrics', () => {
    it('should return metrics with required fields', async () => {
      const metrics = await getModerationMetrics();
      expect(metrics.pendingCount).toBeGreaterThan(0);
      expect(metrics.avgReviewTimeMinutes).toBeGreaterThan(0);
      expect(metrics.approvalRate).toBeGreaterThan(0);
      expect(metrics.reviewedThisMonth).toBeGreaterThan(0);
    });
  });

  describe('getModerationHistory', () => {
    it('should return history sorted by review date descending', async () => {
      const history = await getModerationHistory();
      expect(history.length).toBeGreaterThan(0);
      for (let i = 1; i < history.length; i++) {
        expect(new Date(history[i - 1].reviewDate).getTime())
          .toBeGreaterThanOrEqual(new Date(history[i].reviewDate).getTime());
      }
    });

    it('should include both approved and rejected items', async () => {
      const history = await getModerationHistory();
      const approved = history.filter((h) => h.decision === 'approved');
      const rejected = history.filter((h) => h.decision === 'rejected');
      expect(approved.length).toBeGreaterThan(0);
      expect(rejected.length).toBeGreaterThan(0);
    });

    it('should include feedback for rejected items', async () => {
      const history = await getModerationHistory();
      const rejected = history.find((h) => h.decision === 'rejected');
      expect(rejected).toBeDefined();
      expect(rejected!.feedback).toBeTruthy();
    });
  });

  describe('approveTour', () => {
    it('should return ok for valid moderation ID', async () => {
      const result = await approveTour('mod-1', {}, '');
      expect(result.ok).toBe(true);
    });

    it('should return error for unknown ID', async () => {
      const result = await approveTour('nonexistent', {}, '');
      expect(result.ok).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('rejectTour', () => {
    it('should return ok with valid feedback', async () => {
      const result = await rejectTour('mod-1', 'audio_quality', 'Bruit de fond trop present sur les POIs 2 et 3.', []);
      expect(result.ok).toBe(true);
    });

    it('should reject feedback too short', async () => {
      const result = await rejectTour('mod-1', 'audio_quality', 'Trop court', []);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('20');
    });

    it('should return error for unknown ID', async () => {
      const result = await rejectTour('nonexistent', 'audio_quality', 'Feedback suffisamment long pour le test.', []);
      expect(result.ok).toBe(false);
    });
  });

  describe('getQueueItemIds', () => {
    it('should return array of IDs matching queue order', async () => {
      const ids = await getQueueItemIds();
      const queue = await getModerationQueue();
      expect(ids).toEqual(queue.map((item) => item.id));
    });
  });

  // ===== Epic 14 Story 14-3 Tests =====

  describe('getModerationDetail enriched (14-3)', () => {
    it('should include enriched fields: themes, scenes, language', async () => {
      const detail = await getModerationDetail('mod-1');
      expect(detail).not.toBeNull();
      expect(detail!.themes.length).toBeGreaterThan(0);
      expect(detail!.scenes.length).toBeGreaterThan(0);
      expect(detail!.languePrincipale).toBe('fr');
      expect(detail!.difficulty).toBe('facile');
    });

    it('should include guide profile info', async () => {
      const detail = await getModerationDetail('mod-1');
      expect(detail!.guideBio).toBeTruthy();
      expect(detail!.guideLanguages.length).toBeGreaterThan(0);
      expect(detail!.guideTourCount).toBeGreaterThan(0);
    });

    it('should include admin comments for resubmitted tour', async () => {
      const detail = await getModerationDetail('mod-2');
      expect(detail!.adminComments.length).toBeGreaterThan(0);
      const globalComment = detail!.adminComments.find((c) => !c.sceneId);
      expect(globalComment).toBeDefined();
    });

    it('should include descriptionLongue', async () => {
      const detail = await getModerationDetail('mod-1');
      expect(detail!.descriptionLongue).toBeTruthy();
      expect(detail!.descriptionLongue.length).toBeGreaterThan(detail!.description.length);
    });
  });

  describe('sendBackForRevision (14-3)', () => {
    it('should return ok for valid moderation ID', async () => {
      const result = await sendBackForRevision('mod-1', 'Corrections necessaires sur la scene 2');
      expect(result.ok).toBe(true);
    });

    it('should return error for unknown ID', async () => {
      const result = await sendBackForRevision('nonexistent', 'Feedback');
      expect(result.ok).toBe(false);
    });
  });

  describe('addReviewComment (14-3)', () => {
    it('should return ok for global comment', async () => {
      const result = await addReviewComment('grasse-parfums-modernes', {
        comment: 'Excellent parcours !',
        reviewerId: 'admin-1',
        reviewerName: 'Admin Test',
      });
      expect(result.ok).toBe(true);
    });

    it('should return ok for scene-level comment', async () => {
      const result = await addReviewComment('grasse-parfums-modernes', {
        sceneId: 'scene-1',
        comment: 'Audio faible sur cette scene',
        reviewerId: 'admin-1',
        reviewerName: 'Admin Test',
      });
      expect(result.ok).toBe(true);
    });
  });
});
