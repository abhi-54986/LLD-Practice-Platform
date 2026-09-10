import "dotenv/config";
import { connectToDatabase, disconnectFromDatabase } from "../config/database.js";
import { Problem } from "../models/Problem.js";

type SeedProblem = {
  slug: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  requirementsMd: string;
  constraints: string[];
  tags: string[];
};

const problems: SeedProblem[] = [
  {
    slug: "parking-lot",
    title: "Parking Lot",
    difficulty: "Medium",
    requirementsMd:
      "Design a parking lot that supports multiple vehicle types, spot assignment, entry and exit gates, and fee calculation.",
    constraints: [
      "A vehicle can occupy only a compatible spot.",
      "The lot can contain multiple floors and entry or exit gates.",
      "Fee calculation should support different vehicle types and parking durations.",
    ],
    tags: ["object-oriented-design", "strategy-pattern", "resource-allocation"],
  },
  {
    slug: "elevator-system",
    title: "Elevator System",
    difficulty: "Hard",
    requirementsMd:
      "Design an elevator system that accepts requests, dispatches elevators, and handles movement, doors, and emergency behavior.",
    constraints: [
      "The building can have multiple elevators and floors.",
      "Requests may be made from a floor or from inside an elevator.",
      "The dispatching policy should be replaceable as requirements evolve.",
    ],
    tags: ["state-pattern", "scheduling", "concurrency"],
  },
  {
    slug: "vending-machine",
    title: "Vending Machine",
    difficulty: "Easy",
    requirementsMd:
      "Design a vending machine that displays products, accepts money, dispenses an item, and returns change.",
    constraints: [
      "The machine must reject invalid payment and unavailable products.",
      "The transaction must be cancellable before dispensing.",
      "Inventory and payment behavior should be independently extensible.",
    ],
    tags: ["state-pattern", "inventory", "payments"],
  },
  {
    slug: "library-management-system",
    title: "Library Management System",
    difficulty: "Medium",
    requirementsMd:
      "Design a library management system for cataloging books, lending and returning copies, reservations, and member notifications.",
    constraints: [
      "A title may have multiple physical copies.",
      "A member cannot borrow an unavailable copy.",
      "The system should support overdue tracking and notification channels.",
    ],
    tags: ["domain-modeling", "observer-pattern", "search"],
  },
  {
    slug: "hotel-reservation-system",
    title: "Hotel Reservation System",
    difficulty: "Medium",
    requirementsMd:
      "Design a hotel reservation system that searches room availability, creates and cancels reservations, and supports pricing rules.",
    constraints: [
      "A room cannot be reserved for overlapping dates.",
      "Room types, rate plans, and cancellation policies should be configurable.",
      "The design should leave room for payment and notification integrations.",
    ],
    tags: ["resource-allocation", "strategy-pattern", "availability"],
  },
];

async function seed(): Promise<void> {
  await connectToDatabase();

  try {
    await Problem.bulkWrite(
      problems.map((problem) => ({
        updateOne: {
          filter: { slug: problem.slug },
          update: { $set: problem },
          upsert: true,
        },
      })),
    );

    console.log(`Seeded ${problems.length} problems.`);
    console.log(
      "Additional problem: Hotel Reservation System, chosen to cover date-range availability and configurable pricing.",
    );
  } finally {
    await disconnectFromDatabase();
  }
}

seed().catch(async (error: unknown) => {
  console.error(error);
  await disconnectFromDatabase();
  process.exitCode = 1;
});