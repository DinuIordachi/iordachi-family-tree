import { Component, ElementRef, OnInit } from '@angular/core';
import * as f3 from 'family-chart';
import { SAMPLE_FAMILY_TREE } from './tree-data';
import { Data } from 'family-chart';

@Component({
  selector: 'app-tree',
  standalone: true,
  templateUrl: './tree.component.html',
  styleUrl: './tree.component.scss',
})
export class TreeComponent implements OnInit {
  constructor(private elementRef: ElementRef) {}

  ngOnInit() {
    create(data());

    function create(data: Data) {
      const f3Chart = f3
        .createChart('#FamilyChart', data)
        .setTransitionTime(1000)
        .setCardXSpacing(350)
        .setCardYSpacing(180)
        .setSingleParentEmptyCard(true, { label: 'ADD' })
        .setShowSiblingsOfMain(false)
        .setOrientationVertical();

      const f3Card = f3Chart
        .setCardHtml()
        .setCardDisplay([['first name', 'last name'], ['birthday']])
        .setMiniTree(true)
        .setStyle('imageRect')
        .setOnHoverPathToMain();

      f3Chart
        .editTree()
        .fixed()
        .setFields(['first name', 'last name', 'birthday'])
        .setNoEdit()
        .setCardClickOpen(f3Card);

      f3Chart.updateTree({ initial: true });
    }

    function data(): Data {
      return SAMPLE_FAMILY_TREE;
    }
  }
}
