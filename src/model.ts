import {
  Action,
  action,
  atom,
  AtomMut,
  withAssign,
  withReset,
} from "@reatom/framework";

export type Field = boolean[][];

export type UserFieldAtom = UserItemAtom[][];
export type UserItemAtom = {
  id: string;
  item: boolean;
  isHiddenAtom: AtomMut<boolean>;
  isWrongAtom: AtomMut<boolean>;
  update: Action<[choice: boolean], Promise<void>>;
};

const createTimerAtom = (interval: number, name: string) => {
  let id = 0;

  return atom(0, name).pipe(
    withReset(),
    withAssign((target) => ({
      start: action((ctx) => {
        id = setInterval(() => {
          target(ctx, (prev) => prev + 1);
        }, interval);
      }, "start"),
      stop: action(() => {
        clearInterval(id);
      }, "stop"),
    })),
  );
};

export const gameStatus = {
  statusAtom: atom<"start" | "playing" | "complete" | "game-over">(
    "start",
    "statusAtom",
  ).pipe(withReset()),
  fieldSizeAtom: atom(5, "fieldSizeAtom"),
  // eslint-disable-next-line @reatom/reatom-prefix-rule
  timerAtom: createTimerAtom(1000, "gameTimer"),
  amountOfMistakesAtom: atom(0, "amountOfMistakesAtom").pipe(withReset()),
  maxAmountOfMistakesAtom: atom(3, "maxAmountOfMistakesAtom"),
  amountOfShownItemsAtom: atom(0, "amountOfShownItemsAtom").pipe(withReset()),
};

gameStatus.statusAtom.onChange((ctx, status) => {
  switch (status) {
    case "start":
      gameStatus.statusAtom.reset(ctx);
      gameStatus.timerAtom.reset(ctx);
      gameStatus.amountOfMistakesAtom.reset(ctx);
      gameStatus.amountOfShownItemsAtom.reset(ctx);
      break;
    case "playing":
      createField(ctx);
      gameStatus.timerAtom.start(ctx);
      break;
    case "complete":
      gameStatus.timerAtom.stop(ctx);
      break;
    case "game-over":
      gameStatus.timerAtom.stop(ctx);
      break;
  }
});

gameStatus.amountOfShownItemsAtom.onChange((ctx, amount) => {
  const fieldSize = ctx.get(gameStatus.fieldSizeAtom);

  if (amount === fieldSize * fieldSize) {
    gameStatus.statusAtom(ctx, "complete");
  }
});

gameStatus.amountOfMistakesAtom.onChange((ctx, amount) => {
  if (amount > ctx.get(gameStatus.maxAmountOfMistakesAtom)) {
    gameStatus.statusAtom(ctx, "game-over");
  }
});

export const $fieldAtom = atom<boolean[][] | null>(null, "$fieldAtom");

export const $fieldDescriptorAtom = atom<{
  rows: number[][];
  columns: number[][];
}>((ctx) => {
  const field = ctx.spy($fieldAtom);
  const size = ctx.spy(gameStatus.fieldSizeAtom);

  if (field === null) {
    return { rows: [], columns: [] };
  }

  const rows: number[][] = Array.from(Array(size), () => []);
  const columns: number[][] = Array.from(Array(size), () => []);

  field.forEach((row, rowIndex) => {
    row.forEach((item, columnIndex) => {
      if (item) {
        if (rows[rowIndex].length === 0 || !field[rowIndex][columnIndex - 1]) {
          rows[rowIndex].push(1);
        } else {
          rows[rowIndex][rows[rowIndex].length - 1]++;
        }

        if (
          columns[columnIndex].length === 0 ||
          !field[rowIndex - 1][columnIndex]
        ) {
          columns[columnIndex].push(1);
        } else {
          columns[columnIndex][columns[columnIndex].length - 1]++;
        }
      }
    });
  });

  return { rows, columns };
}, "$fieldDescriptorAtom");

$fieldDescriptorAtom.onChange((_ctx, { rows, columns }) => {
  console.log("result", { rows, columns });
});

export const createField = action<Field>((ctx) => {
  const size = ctx.get(gameStatus.fieldSizeAtom);

  const field = Array.from(Array(size), () =>
    Array.from(Array(size), () => Math.random() > 0.5),
  );

  $fieldAtom(ctx, field);
}, "createField");

export const $userFieldAtom = atom<UserFieldAtom | null>((ctx) => {
  const field = ctx.spy($fieldAtom);

  if (field === null) {
    return null;
  }

  return field.map((row, rowIndex) =>
    row.map((item, columnIndex) =>
      createItem({ row: rowIndex, column: columnIndex, item: item }),
    ),
  );
}, "$userFieldAtom");

interface CreateItemParams {
  row: number;
  column: number;
  item: boolean;
}

const createItem = ({ row, column, item }: CreateItemParams): UserItemAtom => {
  const userItem: UserItemAtom = {
    id: `${row}-${column}`,
    item: item,
    isHiddenAtom: atom(true, "isHiddenAtom"),
    isWrongAtom: atom(false, "isWrongAtom"),
    update: action(async (ctx, choice) => {
      if (!ctx.get(userItem.isHiddenAtom)) {
        return;
      }

      userItem.isHiddenAtom(ctx, false);
      userItem.isWrongAtom(ctx, item !== choice);

      gameStatus.amountOfShownItemsAtom(ctx, (prev) => prev + 1);

      if (item !== choice) {
        gameStatus.amountOfMistakesAtom(ctx, (prev) => prev + 1);
      }

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const isUpdated = await ctx.schedule(() => {
          return completeField(ctx, { column, row });
        });

        if (!isUpdated) {
          break;
        }
      }
    }, "update"),
  };

  return userItem;
};

const completeField = action(
  (ctx, { column, row }: { row: number; column: number }) => {
    const fieldSize = ctx.get(gameStatus.fieldSizeAtom);
    const userField = ctx.get($userFieldAtom);

    if (userField === null) {
      return;
    }

    let rowCheckedAmount = 0;
    let userRowCheckedAmount = 0;

    let columnCheckedAmount = 0;
    let userColumnCheckedAmount = 0;

    for (let index = 0; index < fieldSize; ++index) {
      const userRowItem = userField[row][index];
      const userColumnItem = userField[index][column];

      if (userRowItem.item) {
        rowCheckedAmount++;

        if (!ctx.get(userRowItem.isHiddenAtom)) {
          userRowCheckedAmount++;
        }
      }

      if (userColumnItem.item) {
        columnCheckedAmount++;

        if (!ctx.get(userColumnItem.isHiddenAtom)) {
          userColumnCheckedAmount++;
        }
      }
    }

    let isUpdated = false;

    if (rowCheckedAmount === userRowCheckedAmount && rowCheckedAmount !== 0) {
      for (let index = 0; index < fieldSize; ++index) {
        const userRowItem = userField[row][index];

        if (ctx.get(userRowItem.isHiddenAtom)) {
          userRowItem.isHiddenAtom(ctx, false);
          gameStatus.amountOfShownItemsAtom(ctx, (prev) => prev + 1);

          isUpdated = true;
        }
      }
    }

    if (
      columnCheckedAmount === userColumnCheckedAmount &&
      columnCheckedAmount !== 0
    ) {
      for (let index = 0; index < fieldSize; ++index) {
        const userColumnItem = userField[index][column];

        if (ctx.get(userColumnItem.isHiddenAtom)) {
          userColumnItem.isHiddenAtom(ctx, false);
          gameStatus.amountOfShownItemsAtom(ctx, (prev) => prev + 1);

          isUpdated = true;
        }
      }
    }

    return isUpdated;
  },
  "completeField",
);
