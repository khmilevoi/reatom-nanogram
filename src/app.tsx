import "./app.css";
import { reatomComponent } from "@reatom/npm-react";
import {
  $fieldDescriptorAtom,
  $userFieldAtom,
  gameStatus,
  UserItemAtom,
} from "./model.ts";
import { clsx } from "clsx";
import { FunctionComponent, MouseEvent, useState } from "react";

export const App = reatomComponent(() => {
  return (
    <div>
      <Status />
      <Field />
    </div>
  );
}, "App");

const Status = reatomComponent(({ ctx }) => {
  const [size, setSize] = useState(ctx.get(gameStatus.fieldSizeAtom) / 5);

  return (
    <>
      {
        {
          start: (
            <div>
              <input
                type={"number"}
                value={size}
                onChange={(event) => setSize(event.currentTarget.valueAsNumber)}
              />
              <button
                key={"action"}
                onClick={() => {
                  gameStatus.fieldSizeAtom(ctx, size * 5);
                  return gameStatus.statusAtom(ctx, "playing");
                }}
              >
                Play
              </button>
            </div>
          ),
          playing: (
            <div>
              <div>Playing</div>
              <span>{ctx.spy(gameStatus.timerAtom)} sec</span>
              <br />
              <span>
                {ctx.spy(gameStatus.amountOfMistakesAtom)}/
                {ctx.get(gameStatus.maxAmountOfMistakesAtom)} mistakes
              </span>
              <br />
              <button
                key={"action"}
                onClick={() => {
                  gameStatus.statusAtom(ctx, "start");
                }}
              >
                Restart
              </button>
            </div>
          ),
          complete: (
            <div>
              <div>Complete</div>
              <span>{ctx.spy(gameStatus.timerAtom)} sec</span>
              <br />
              <span>
                {ctx.spy(gameStatus.amountOfMistakesAtom)}/
                {ctx.get(gameStatus.maxAmountOfMistakesAtom)} mistakes
              </span>
              <br />
              <button
                key={"action"}
                onClick={() => gameStatus.statusAtom(ctx, "start")}
              >
                Restart
              </button>
            </div>
          ),
          "game-over": (
            <div>
              <div>Game Over</div>
              <span>{ctx.spy(gameStatus.timerAtom)} sec</span>
              <br />
              <span>{ctx.spy(gameStatus.amountOfMistakesAtom)}/3 mistakes</span>
              <br />
              <button
                key={"action"}
                onClick={() => gameStatus.statusAtom(ctx, "start")}
              >
                Restart
              </button>
            </div>
          ),
        }[ctx.spy(gameStatus.statusAtom)]
      }
    </>
  );
}, "Status");

export const Field = reatomComponent(({ ctx }) => {
  const userField = ctx.spy($userFieldAtom);

  if (userField === null) {
    return null;
  }

  const fieldDescriptor = ctx.spy($fieldDescriptorAtom);

  return (
    <div className={"field-container"}>
      <div className={"row-nums"}>
        <Amounts descriptor={fieldDescriptor.rows} />
      </div>
      <div className={"column-nums"}>
        <Amounts descriptor={fieldDescriptor.columns} />
      </div>
      <div className={"field"}>
        {userField.map((row, index) => (
          <Row key={index} userRow={row} />
        ))}
      </div>
    </div>
  );
}, "Field");

const Amounts: FunctionComponent<{ descriptor: number[][] }> = ({
  descriptor,
}) => {
  return descriptor.map((amounts, index) => (
    <div key={index} className={"amounts"}>
      {amounts.map((amount, index) => (
        <span key={index} className={"amount"}>
          {amount}
        </span>
      ))}
    </div>
  ));
};

const Row = reatomComponent<{ userRow: UserItemAtom[] }>(({ userRow }) => {
  return (
    <div className={"row"}>
      {userRow.map((item) => (
        <Item key={item.id} userItem={item} />
      ))}
    </div>
  );
}, "Row");

const Item = reatomComponent<{ userItem: UserItemAtom }>(
  ({ ctx, userItem }) => {
    const item = userItem.item;
    const isHidden = ctx.spy(userItem.isHiddenAtom);
    const isWrong = ctx.spy(userItem.isWrongAtom);

    const handleMouseEnter = (event: MouseEvent<HTMLDivElement>) => {
      event.preventDefault();

      if (event.buttons !== 1 && event.buttons !== 2) {
        return;
      }

      userItem.update(ctx, event.buttons === 1);
    };

    const handleClick = (event: MouseEvent<HTMLDivElement>) => {
      event.preventDefault();

      if (event.button !== 0 && event.button !== 2) {
        return;
      }

      userItem.update(ctx, event.button === 0);
    };

    return (
      <div
        className={clsx(
          "item",
          calculateStatus(isHidden, item),
          isWrong && "wrong",
        )}
        onMouseEnter={handleMouseEnter}
        onMouseDown={handleClick}
        onContextMenu={(event) => {
          event.preventDefault();
        }}
      ></div>
    );
  },
  "Item",
);

const calculateStatus = (isHidden: boolean, item: boolean) => {
  if (isHidden) {
    return;
  }

  if (item) {
    return "checked";
  } else {
    return "crossed";
  }
};
