from __future__ import annotations

from typing import Any
import cv2
import numpy as np
from PIL import Image


def detect_copy_move(
    image: Image.Image,
    min_cluster_points: int = 28,
    spatial_dist_threshold: float = 30.0,
) -> dict[str, Any]:
    try:
        # Convert PIL to OpenCV grayscale
        img_np = np.array(image.convert("RGB"))
        gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
        h, w = gray.shape

        # Initialize ORB detector
        orb = cv2.ORB_create(nfeatures=2000, fastThreshold=15)
        keypoints, descriptors = orb.detectAndCompute(gray, None)

        if descriptors is None or len(keypoints) < 15:
            return {
                "checkName": "copy_move_clone_detection",
                "result": "pass",
                "confidence": 85,
                "explanation": "Insufficient distinct keypoints to identify copy-move duplication.",
                "flagged_region": None,
                "matches_found": 0,
            }

        # Match keypoints against themselves using k-NN with k=3
        # m[0] is self-match (dist 0), m[1] is 1st neighbor, m[2] is 2nd neighbor
        bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=False)
        matches = bf.knnMatch(descriptors, descriptors, k=3)

        src_pts = []
        dst_pts = []
        shift_vectors = []

        for m in matches:
            if len(m) < 3:
                continue
            # Self-match is m[0]
            first_neighbor = m[1]
            second_neighbor = m[2]

            # Ratio test
            if first_neighbor.distance < 0.78 * second_neighbor.distance:
                pt1 = np.array(keypoints[first_neighbor.queryIdx].pt)
                pt2 = np.array(keypoints[first_neighbor.trainIdx].pt)

                # Ignore very close neighbors (same texture/edge)
                dist = np.linalg.norm(pt1 - pt2)
                if dist > spatial_dist_threshold:
                    src_pts.append(pt1)
                    dst_pts.append(pt2)
                    shift_vectors.append(pt2 - pt1)

        if len(src_pts) < min_cluster_points:
            return {
                "checkName": "copy_move_clone_detection",
                "result": "pass",
                "confidence": 90,
                "explanation": "No clustered keypoint duplications or copy-move artifacts detected in the document.",
                "flagged_region": None,
                "matches_found": len(src_pts),
            }

        # Cluster displacement vectors to find coherent translations
        src_arr = np.array(src_pts, dtype=np.float32)
        dst_arr = np.array(dst_pts, dtype=np.float32)

        # RANSAC homography / affine consistency check
        _, inliers = cv2.estimateAffinePartial2D(src_arr, dst_arr, method=cv2.RANSAC, ransacReprojThreshold=5.0)

        inlier_count = int(np.sum(inliers)) if inliers is not None else 0

        if inlier_count >= min_cluster_points:
            inlier_indices = np.where(inliers.ravel() == 1)[0]
            flagged_pts = src_arr[inlier_indices]

            min_x = float(np.min(flagged_pts[:, 0]))
            max_x = float(np.max(flagged_pts[:, 0]))
            min_y = float(np.min(flagged_pts[:, 1]))
            max_y = float(np.max(flagged_pts[:, 1]))

            pad = 10
            bx = max(0, min_x - pad)
            by = max(0, min_y - pad)
            bw = min(w - bx, (max_x - min_x) + 2 * pad)
            bh = min(h - by, (max_y - min_y) + 2 * pad)

            flagged_region = {
                "x": round((bx / w) * 100),
                "y": round((by / h) * 100),
                "width": round((bw / w) * 100),
                "height": round((bh / h) * 100),
            }

            return {
                "checkName": "copy_move_clone_detection",
                "result": "flag",
                "confidence": max(15, min(40, round(40 - inlier_count * 2))),
                "explanation": f"Detected {inlier_count} geometrically consistent duplicated keypoints, indicating a cloned stamp, signature, or spliced element.",
                "flagged_region": flagged_region,
                "matches_found": inlier_count,
            }

        return {
            "checkName": "copy_move_clone_detection",
            "result": "pass",
            "confidence": 88,
            "explanation": "No geometrically consistent copy-move or cloned clusters found.",
            "flagged_region": None,
            "matches_found": inlier_count,
        }

    except Exception as exc:
        return {
            "checkName": "copy_move_clone_detection",
            "result": "not_applicable",
            "confidence": 0,
            "explanation": f"Copy-move analysis could not be completed: {exc}",
            "flagged_region": None,
            "matches_found": 0,
        }
