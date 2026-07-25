import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../config/firebase";
import { COLLECTION_NAMES } from "../constants/collectionNames";

const CHUNK_SIZE = 10;

const text = (value) => String(value || "").trim();
const unique = (items) => Array.from(new Map(items.filter(Boolean).map((item) => [item.id, item])).values());
const snapshotItems = (snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));

const userLookupIds = (user) => new Set([
  user?.uid, user?.authUid, user?.profileId, user?.id, user?.userId,
  user?.customerId, user?.accountId, user?.fullName, user?.displayName, user?.email
].map(text).filter(Boolean));

const assignedBuildingIds = (user) => new Set([
  user?.assignedBuildingId, user?.buildingId, user?.assignedBuilding, user?.building,
  ...(Array.isArray(user?.assignedBuildingIds) ? user.assignedBuildingIds : []),
  ...(Array.isArray(user?.buildingIds) ? user.buildingIds : [])
].map(text).filter(Boolean));

const isCustomerBuilding = (building, customerIds, buildingIds) => {
  const customerFields = [building.customerId, building.customer, building.customerName, building.ownerId, building.createdBy]
    .map(text).filter(Boolean);
  const ids = [building.id, building.buildingId, building.buildingName, building.building_name, building.name]
    .map(text).filter(Boolean);
  return customerFields.some((value) => customerIds.has(value)) || ids.some((value) => buildingIds.has(value));
};

const chunk = (items) => items.reduce((groups, item, index) => {
  const groupIndex = Math.floor(index / CHUNK_SIZE);
  groups[groupIndex] = groups[groupIndex] || [];
  groups[groupIndex].push(item);
  return groups;
}, []);

const useBuildingRecords = (collectionName, buildingIds, onUpdate, onError) => {
  useEffect(() => {
    if (!buildingIds.length) {
      onUpdate([]);
      return undefined;
    }
    const results = chunk(buildingIds).map(() => []);
    const unsubscribes = chunk(buildingIds).map((ids, index) => onSnapshot(
      query(collection(db, collectionName), where("buildingId", "in", ids)),
      (snapshot) => {
        results[index] = snapshotItems(snapshot);
        onUpdate(unique(results.flat()));
      },
      onError
    ));
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [buildingIds.join("|"), collectionName, onError, onUpdate]);
};

export const useCustomerLiveData = (user) => {
  const [buildings, setBuildings] = useState([]);
  const [issues, setIssues] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [fireDrills, setFireDrills] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const customerIds = useMemo(() => userLookupIds(user), [user]);
  const profileBuildingIds = useMemo(() => assignedBuildingIds(user), [user]);

  useEffect(() => {
    if (!user) return undefined;
    setLoading(true);
    return onSnapshot(collection(db, COLLECTION_NAMES.BUILDINGS), (snapshot) => {
      setBuildings(snapshotItems(snapshot).filter((building) => isCustomerBuilding(building, customerIds, profileBuildingIds)));
      setLoading(false);
    }, (listenerError) => {
      setError(listenerError.message || "Unable to load your building data.");
      setLoading(false);
    });
  }, [customerIds, profileBuildingIds, user]);

  const buildingIds = useMemo(() => buildings.map((building) => building.id), [buildings]);
  const recordError = useCallback(
    (listenerError) => setError(listenerError.message || "Unable to sync live building records."),
    []
  );
  useBuildingRecords(COLLECTION_NAMES.ISSUES, buildingIds, setIssues, recordError);
  useBuildingRecords(COLLECTION_NAMES.INSPECTIONS, buildingIds, setInspections, recordError);
  useBuildingRecords(COLLECTION_NAMES.FIRE_DRILLS, buildingIds, setFireDrills, recordError);
  useBuildingRecords(COLLECTION_NAMES.REPORTS, buildingIds, setReports, recordError);

  return { buildings, issues, inspections, fireDrills, reports, loading, error };
};
